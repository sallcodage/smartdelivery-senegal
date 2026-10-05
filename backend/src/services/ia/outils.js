// ─────────────────────────────────────────────────────────────────────
//  Outils de l'assistant : SEULE porte d'accès de l'IA aux données.
//  Chaque outil est exécuté par le backend, pour le client connecté uniquement.
//  L'IA ne peut ni lire la base directement, ni voir les données d'un autre client.
// ─────────────────────────────────────────────────────────────────────
const { query } = require('../../config/db');
const commandes = require('../commandeService');
const suivi = require('../suiviService');
const tarif = require('../tarifService');
const zones = require('../zoneService');
const { camel } = require('../../utils/format');
const { distanceKm, arrondir, dureeEstimeeMinutes, VITESSE_MOYENNE_KMH } = require('../../utils/geo');
const { LIBELLES_STATUT } = require('../../utils/constantes');

const LIBELLES_COLIS = { DOCUMENTS: 'Documents', PRODUITS: 'Produits', NOURRITURE: 'Nourriture', AUTRES: 'Autres' };
const dateDakar = (d) => (d ? new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar', dateStyle: 'short', timeStyle: 'short' }) : null);
const minutesDepuis = (d) => Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));

// « cmd-12 », « CMD 000012 », « commande 12 » → « CMD-000012 »
function normaliserNumero(texte) {
  const m = /(?:CMD[-\s]?)?(\d{1,6})/i.exec(String(texte || '').trim());
  return m ? `CMD-${m[1].padStart(6, '0')}` : null;
}

const DEFINITIONS = [
  {
    nom: 'consulter_commande',
    description: "Retourne l'état réel d'une commande du client connecté (statut, livreur, historique, suivi GPS en cours). À utiliser pour toute question sur une commande précise.",
    parametres: { type: 'object', properties: { numero: { type: 'string', description: 'Numéro de commande, ex. CMD-000123' } }, required: ['numero'] },
  },
  {
    nom: 'lister_mes_commandes',
    description: 'Liste les commandes récentes du client connecté. À utiliser quand le client parle de « ma commande » sans donner de numéro.',
    parametres: { type: 'object', properties: { filtre: { type: 'string', enum: ['toutes', 'en_cours', 'terminees', 'annulees'], description: 'Commandes à inclure' } } },
  },
  {
    nom: 'estimer_tarif',
    description: "Calcule le prix et la durée estimés d'une livraison avec la formule officielle de SmartDelivery. Fournir soit les deux adresses (au Sénégal), soit la distance en km. Seule source autorisée pour un prix ou un délai.",
    parametres: {
      type: 'object',
      properties: {
        adresse_depart: { type: 'string', description: 'Adresse ou quartier de départ, ex. « Plateau, Dakar »' },
        adresse_arrivee: { type: 'string', description: "Adresse ou quartier d'arrivée, ex. « Almadies, Dakar »" },
        distance_km: { type: 'number', description: 'Distance en kilomètres, si le client la donne' },
      },
    },
  },
  {
    nom: 'informations_service',
    description: 'Informations officielles sur SmartDelivery : zones desservies, paramètres de tarification, signification des statuts, règles (annulation, confirmation, notation).',
    parametres: { type: 'object', properties: {} },
  },
];

async function consulterCommande({ numero }, { client }) {
  const n = normaliserNumero(numero);
  if (!n) return { trouve: false, message: "Numéro de commande non reconnu. Format attendu : CMD-000123." };
  const { rows } = await query('SELECT id FROM commandes WHERE numero = $1 AND client_id = $2', [n, client.id]);
  if (!rows[0]) return { trouve: false, numero: n, message: "Aucune commande portant ce numéro n'existe dans le compte de ce client. Ne rien supposer sur cette commande." };

  const c = await commandes.obtenir(rows[0].id, client);
  const resultat = {
    trouve: true,
    commande_id: c.id,
    numero: c.numero,
    statut: c.libelleStatut,
    date_creation: dateDakar(c.dateCreation),
    depart: c.depart.adresse,
    arrivee: c.arrivee.adresse,
    type_colis: LIBELLES_COLIS[c.typeColis],
    poids_kg: c.poidsKg,
    distance_estimee_km: c.distanceKm,
    montant_fcfa: c.montant,
    livreur: c.livraison && c.statut !== 'ANNULEE'
      ? { nom: c.livraison.livreur.nom, vehicule: c.livraison.livreur.vehicule, note_moyenne: c.livraison.livreur.noteMoyenne }
      : null,
    historique: c.historique.map((h) => ({ etape: h.libelle, date: dateDakar(h.dateChangement) })),
    lien_suivi: `/client/commandes/${c.id}/suivi`,
  };
  if (c.statut === 'EN_COURS') {
    const s = await suivi.suivre(c.id, client);
    resultat.suivi_gps = s.dernierePosition
      ? {
        derniere_position_il_y_a_min: minutesDepuis(s.dernierePosition.dateHeure),
        distance_restante_km: s.distanceRestanteKm,
        duree_restante_estimee_min: dureeEstimeeMinutes(s.distanceRestanteKm),
        hypothese: `Estimation à vol d'oiseau, vitesse moyenne de ${VITESSE_MOYENNE_KMH} km/h`,
      }
      : { message: "Le livreur n'a pas encore transmis de position GPS." };
  } else {
    resultat.suivi_gps = { message: 'Le suivi GPS en direct est disponible uniquement pendant la livraison (statut « En cours »).' };
  }
  return resultat;
}

const FILTRES = {
  toutes: null,
  en_cours: ['NOUVELLE', 'VALIDEE', 'LIVREUR_AFFECTE', 'ACCEPTEE', 'EN_COURS'],
  terminees: ['LIVREE', 'CONFIRMEE'],
  annulees: ['ANNULEE'],
};

async function listerMesCommandes({ filtre = 'toutes' }, { client }) {
  const statuts = FILTRES[filtre] === undefined ? null : FILTRES[filtre];
  const { donnees, pagination } = await commandes.lister(client, { statuts: statuts || [], limite: 10 });
  return {
    nombre_total: pagination.total,
    commandes: donnees.map((c) => ({
      numero: c.numero, statut: c.libelleStatut, date: dateDakar(c.dateCreation),
      trajet: `${c.depart.adresse} vers ${c.arrivee.adresse}`, montant_fcfa: c.montant,
      livreur: c.livraison && c.statut !== 'ANNULEE' ? c.livraison.livreur.nom : null,
    })),
  };
}

// Géocodage côté serveur (OpenStreetMap / Nominatim), limité au Sénégal
async function geocoder(adresse) {
  const params = new URLSearchParams({ q: adresse, format: 'jsonv2', countrycodes: 'sn', limit: '1', 'accept-language': 'fr' });
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'SmartDelivery-Senegal/1.0 (projet academique)' }, signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`Géocodage HTTP ${r.status}`);
  const [lieu] = await r.json();
  return lieu ? { latitude: Number(lieu.lat), longitude: Number(lieu.lon), libelle: lieu.display_name.split(',').slice(0, 3).join(',') } : null;
}

async function estimerTarif({ adresse_depart: depart, adresse_arrivee: arrivee, distance_km: distanceDonnee }) {
  const parametres = await tarif.obtenirParametres();
  let distance;
  const resultat = {};
  if (Number.isFinite(Number(distanceDonnee)) && Number(distanceDonnee) > 0) {
    distance = arrondir(Math.min(Number(distanceDonnee), 500));
    resultat.source_distance = 'distance indiquée par le client';
  } else if (depart && arrivee) {
    let a; let b;
    try {
      [a, b] = await Promise.all([geocoder(depart), geocoder(arrivee)]);
    } catch {
      return { possible: false, raison: "Le service de localisation des adresses est indisponible. Le client peut obtenir le prix exact dans « Nouvelle commande »." };
    }
    if (!a || !b) {
      return { possible: false, raison: `Adresse introuvable : ${!a ? depart : arrivee}. Demander une adresse plus précise ou utiliser « Nouvelle commande » (placement sur la carte).` };
    }
    distance = arrondir(distanceKm(a.latitude, a.longitude, b.latitude, b.longitude));
    Object.assign(resultat, { depart_localise: a.libelle, arrivee_localisee: b.libelle, source_distance: "distance à vol d'oiseau entre les adresses localisées" });
  } else {
    return { possible: false, raison: "Il faut soit l'adresse de départ et l'adresse d'arrivée, soit la distance en km." };
  }
  return {
    possible: true,
    ...resultat,
    distance_km: distance,
    montant_fcfa: tarif.calculerMontant(distance, parametres),
    duree_estimee_min: dureeEstimeeMinutes(distance),
    precision: `Estimation indicative (vitesse moyenne ${VITESSE_MOYENNE_KMH} km/h). Le prix définitif est calculé lors de la création de la commande.`,
  };
}

async function informationsService() {
  const [p, z] = await Promise.all([tarif.obtenirParametres(), zones.lister()]);
  return {
    zones_desservies: z.map((x) => x.nom),
    tarification: {
      prix_base_fcfa: p.prixBase, prix_par_km_fcfa: p.prixParKm, montant_minimum_fcfa: p.montantMinimum, arrondi_fcfa: p.arrondi,
      formule: 'max(montant minimum, prix de base + distance × prix par km), arrondi au multiple supérieur',
    },
    statuts: Object.values(LIBELLES_STATUT),
    regles: [
      'Le client peut modifier ou annuler sa commande tant qu\'elle est « En attente » (pas encore validée).',
      "Après validation, l'administration affecte un livreur, qui accepte ou refuse la livraison.",
      'Le suivi GPS en direct est visible pendant la livraison (statut « En cours »).',
      'À la livraison, le client confirme la réception et peut noter le livreur de 1 à 5.',
      'Types de colis : Documents, Produits, Nourriture, Autres.',
    ],
  };
}

const EXECUTEURS = {
  consulter_commande: consulterCommande,
  lister_mes_commandes: listerMesCommandes,
  estimer_tarif: estimerTarif,
  informations_service: informationsService,
};

// Exécute un outil et garde une trace (pour la vérification et l'enregistrement)
async function executer(nom, args, contexte) {
  const executeur = EXECUTEURS[nom];
  let resultat;
  try {
    resultat = executeur ? await executeur(args || {}, contexte) : { erreur: `Outil inconnu : ${nom}` };
  } catch (err) {
    console.error(`[Assistant] Outil ${nom} en échec :`, err.message);
    resultat = { erreur: "Impossible d'obtenir cette information pour le moment." };
  }
  contexte.traces.push({ nom, args, resultat });
  return resultat;
}

module.exports = { DEFINITIONS, executer, normaliserNumero, consulterCommande, listerMesCommandes, informationsService };
