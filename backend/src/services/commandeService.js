// ─────────────────────────────────────────────────────────────────────
//  Commandes : création, consultation, modification et cycle de vie.
//  Toutes les transitions passent par executerAction() et la table ACTIONS.
// ─────────────────────────────────────────────────────────────────────
const { query, transaction } = require('../config/db');
const { camel, formaterFCFA, nomComplet } = require('../utils/format');
const { distanceKm, longueurTrajetKm, arrondir } = require('../utils/geo');
const { lirePagination, paginer } = require('../utils/pagination');
const { LIBELLES_STATUT, STATUTS_LIVRAISON_ACTIVE } = require('../utils/constantes');
const tarif = require('./tarifService');
const zones = require('./zoneService');
const notifications = require('./notificationService');
const { introuvable, interdit, conflit, requeteInvalide } = require('../utils/AppError');

const COLONNES = `
  c.id, c.numero, c.statut, c.adresse_depart, c.latitude_depart, c.longitude_depart,
  c.adresse_arrivee, c.latitude_arrivee, c.longitude_arrivee, c.type_colis, c.poids_kg,
  c.distance_km, c.montant, c.date_creation, c.date_modification, c.zone_id, z.nom AS zone,
  c.client_id, uc.prenom || ' ' || uc.nom AS client_nom, uc.telephone AS client_telephone,
  lv.id AS livraison_id, lv.statut AS livraison_statut, lv.livreur_id,
  ul.prenom || ' ' || ul.nom AS livreur_nom, ul.telephone AS livreur_telephone,
  l.vehicule AS livreur_vehicule, l.note_moyenne AS livreur_note,
  lv.date_affectation, lv.date_debut, lv.date_fin, lv.distance_km AS distance_parcourue_km,
  lv.montant AS montant_livreur, lv.note_client`;

const JOINTURES = `
  FROM commandes c
  JOIN zones z         ON z.id = c.zone_id
  JOIN utilisateurs uc ON uc.id = c.client_id
  LEFT JOIN livraisons lv   ON lv.commande_id = c.id
  LEFT JOIN livreurs l      ON l.id = lv.livreur_id
  LEFT JOIN utilisateurs ul ON ul.id = lv.livreur_id`;

// Un client voit ses commandes, un livreur celles qui lui sont affectées, l'admin toutes.
function peutVoir(commande, utilisateur) {
  return utilisateur.role === 'ADMIN'
    || (utilisateur.role === 'CLIENT' && commande.clientId === utilisateur.id)
    || (utilisateur.role === 'LIVREUR' && commande.livreurId === utilisateur.id);
}

function formater(ligne, role) {
  const c = camel(ligne);
  const commande = {
    id: c.id,
    numero: c.numero,
    statut: c.statut,
    libelleStatut: LIBELLES_STATUT[c.statut],
    depart: { adresse: c.adresseDepart, latitude: c.latitudeDepart, longitude: c.longitudeDepart },
    arrivee: { adresse: c.adresseArrivee, latitude: c.latitudeArrivee, longitude: c.longitudeArrivee },
    zone: { id: c.zoneId, nom: c.zone },
    typeColis: c.typeColis,
    poidsKg: c.poidsKg,
    distanceKm: c.distanceKm,
    montant: c.montant,
    dateCreation: c.dateCreation,
    dateModification: c.dateModification,
    client: { id: c.clientId, nom: c.clientNom, telephone: c.clientTelephone },
    livraison: null,
  };
  if (c.livraisonId) {
    commande.livraison = {
      id: c.livraisonId,
      statut: c.livraisonStatut,
      dateAffectation: c.dateAffectation,
      dateDebut: c.dateDebut,
      dateFin: c.dateFin,
      distanceParcourueKm: c.distanceParcourueKm,
      noteClient: c.noteClient,
      livreur: {
        id: c.livreurId, nom: c.livreurNom, telephone: c.livreurTelephone,
        vehicule: c.livreurVehicule, noteMoyenne: c.livreurNote,
      },
    };
    if (role !== 'CLIENT') commande.livraison.montantLivreur = c.montantLivreur;
  }
  return commande;
}

// ── Consultation ─────────────────────────────────────────────────────
// Conditions SQL communes à la liste et à l'export (valeurs toujours paramétrées)
function construireFiltres(utilisateur, filtres) {
  const conditions = [];
  const valeurs = [];
  const ajouter = (sql, valeur) => {
    valeurs.push(valeur);
    conditions.push(sql.replace('?', `$${valeurs.length}`));
  };

  if (utilisateur.role === 'CLIENT') ajouter('c.client_id = ?', utilisateur.id);
  if (utilisateur.role === 'LIVREUR') ajouter('lv.livreur_id = ?', utilisateur.id);
  if (filtres.statuts?.length) ajouter('c.statut = ANY(?::statut_commande[])', filtres.statuts);
  if (filtres.recherche) {
    ajouter(`(c.numero || ' ' || uc.prenom || ' ' || uc.nom || ' ' || c.adresse_depart || ' ' || c.adresse_arrivee)
             ILIKE '%' || ? || '%'`, filtres.recherche);
  }
  // Filtres réservés à l'administrateur
  if (utilisateur.role === 'ADMIN') {
    if (filtres.clientId) ajouter('c.client_id = ?', filtres.clientId);
    if (filtres.livreurId) ajouter('lv.livreur_id = ?', filtres.livreurId);
  }
  if (filtres.zoneId) ajouter('c.zone_id = ?', filtres.zoneId);
  if (filtres.du) ajouter('c.date_creation >= ?::date', filtres.du);
  if (filtres.au) ajouter("c.date_creation < ?::date + 1", filtres.au);
  return { conditions, valeurs };
}

async function lister(utilisateur, filtres) {
  const pagination = lirePagination(filtres);
  const { conditions, valeurs } = construireFiltres(utilisateur, filtres);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT ${COLONNES}, count(*) OVER() AS total ${JOINTURES} ${where}
     ORDER BY c.date_creation DESC
     LIMIT $${valeurs.length + 1} OFFSET $${valeurs.length + 2}`,
    [...valeurs, pagination.limite, pagination.offset]
  );
  const total = rows.length ? rows[0].total : 0;
  return paginer(rows.map((r) => ({ ...formater(r, utilisateur.role), total })), pagination);
}

async function obtenir(id, utilisateur) {
  const { rows } = await query(`SELECT ${COLONNES} ${JOINTURES} WHERE c.id = $1`, [id]);
  if (!rows[0] || !peutVoir(camel(rows[0]), utilisateur)) throw introuvable('Commande introuvable');

  const commande = formater(rows[0], utilisateur.role);
  const historique = await query(
    `SELECT h.ancien_statut, h.nouveau_statut, h.motif, h.date_changement,
            u.prenom || ' ' || u.nom AS auteur, u.role AS auteur_role
     FROM historique_statuts h
     LEFT JOIN utilisateurs u ON u.id = h.auteur_id
     WHERE h.commande_id = $1
     ORDER BY h.date_changement, h.id`,
    [id]
  );
  commande.historique = historique.rows.map((h) => ({
    ...camel(h), libelle: LIBELLES_STATUT[h.nouveau_statut],
  }));
  return commande;
}

// ── Création et modification (client) ────────────────────────────────
async function calculerPrix(executant, d) {
  const distance = tarif.distanceTrajet(d);
  if (distance < 0.05) throw requeteInvalide("Les adresses de départ et d'arrivée sont identiques");
  const parametres = await tarif.obtenirParametres(executant);
  return { distance, montant: tarif.calculerMontant(distance, parametres) };
}

async function creer(utilisateur, d) {
  if (!(await zones.existe(d.zoneId))) throw requeteInvalide('Zone inconnue');

  const id = await transaction(async (c) => {
    // Le montant est TOUJOURS calculé ici : une valeur envoyée par le client est ignorée.
    const { distance, montant } = await calculerPrix(c, d);
    const { rows } = await c.query(
      `INSERT INTO commandes (client_id, adresse_depart, latitude_depart, longitude_depart,
         adresse_arrivee, latitude_arrivee, longitude_arrivee, zone_id, type_colis, poids_kg, distance_km, montant)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, numero`,
      [utilisateur.id, d.adresseDepart, d.latitudeDepart, d.longitudeDepart, d.adresseArrivee,
        d.latitudeArrivee, d.longitudeArrivee, d.zoneId, d.typeColis, d.poidsKg, distance, montant]
    );
    const { id: nouvelId, numero } = rows[0];
    await notifications.creer(c, [utilisateur.id],
      `Votre commande ${numero} a été enregistrée (${formaterFCFA(montant)}). Elle sera validée par notre équipe.`, nouvelId);
    await notifications.notifierAdmins(c, `Nouvelle commande ${numero} de ${nomComplet(utilisateur)} à valider.`, nouvelId);
    return nouvelId;
  }, { utilisateurId: utilisateur.id });

  return obtenir(id, utilisateur);
}

const CHAMPS_MODIFIABLES = ['adresseDepart', 'latitudeDepart', 'longitudeDepart', 'adresseArrivee',
  'latitudeArrivee', 'longitudeArrivee', 'zoneId', 'typeColis', 'poidsKg'];

async function modifier(id, utilisateur, d) {
  await transaction(async (c) => {
    const { rows } = await c.query('SELECT * FROM commandes WHERE id = $1 FOR UPDATE', [id]);
    const actuelle = camel(rows[0]);
    if (!actuelle || actuelle.clientId !== utilisateur.id) throw introuvable('Commande introuvable');
    if (actuelle.statut !== 'NOUVELLE') {
      throw conflit(`La commande ${actuelle.numero} n'est plus modifiable (statut « ${LIBELLES_STATUT[actuelle.statut]} »)`);
    }
    const nouvelle = { ...actuelle };
    for (const champ of CHAMPS_MODIFIABLES) if (d[champ] !== undefined) nouvelle[champ] = d[champ];
    if (d.zoneId !== undefined && !(await zones.existe(d.zoneId, c))) throw requeteInvalide('Zone inconnue');

    const { distance, montant } = await calculerPrix(c, nouvelle);
    await c.query(
      `UPDATE commandes SET adresse_depart = $1, latitude_depart = $2, longitude_depart = $3,
         adresse_arrivee = $4, latitude_arrivee = $5, longitude_arrivee = $6, zone_id = $7,
         type_colis = $8, poids_kg = $9, distance_km = $10, montant = $11
       WHERE id = $12`,
      [nouvelle.adresseDepart, nouvelle.latitudeDepart, nouvelle.longitudeDepart, nouvelle.adresseArrivee,
        nouvelle.latitudeArrivee, nouvelle.longitudeArrivee, nouvelle.zoneId, nouvelle.typeColis,
        nouvelle.poidsKg, distance, montant, id]
    );
  }, { utilisateurId: utilisateur.id });
  return obtenir(id, utilisateur);
}

// ── Étapes spécifiques de certaines transitions ──────────────────────
async function choisirLivreurLePlusProche(c, commande) {
  const { rows } = await c.query(
    `SELECT l.id, u.prenom || ' ' || u.nom AS nom, l.latitude_actuelle, l.longitude_actuelle
     FROM livreurs l JOIN utilisateurs u ON u.id = l.id
     WHERE l.disponibilite AND u.statut_compte = 'ACTIF' AND l.latitude_actuelle IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM livraisons x
                       WHERE x.livreur_id = l.id AND x.statut = ANY($1::statut_livraison[]))
       AND l.id NOT IN (SELECT auteur_id FROM historique_statuts          -- exclut ceux qui ont refusé
                        WHERE commande_id = $2 AND ancien_statut = 'LIVREUR_AFFECTE'
                          AND nouveau_statut = 'VALIDEE' AND auteur_id IS NOT NULL)`,
    [STATUTS_LIVRAISON_ACTIVE, commande.id]
  );
  return rows.map(camel)
    .map((l) => ({
      ...l,
      distanceKm: distanceKm(l.latitudeActuelle, l.longitudeActuelle, commande.latitudeDepart, commande.longitudeDepart),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0] || null;
}

async function affecterLivreur(c, commande, admin, options) {
  let livreur;
  if (options.automatique) {
    livreur = await choisirLivreurLePlusProche(c, commande);
    if (!livreur) {
      throw conflit('Aucun livreur disponible et localisé pour une affectation automatique. Affectez un livreur manuellement.');
    }
  } else {
    const { rows } = await c.query(
      `SELECT l.id, u.prenom || ' ' || u.nom AS nom, l.disponibilite, u.statut_compte
       FROM livreurs l JOIN utilisateurs u ON u.id = l.id WHERE l.id = $1`,
      [options.livreurId]
    );
    livreur = camel(rows[0]);
    if (!livreur) throw introuvable('Livreur introuvable');
    if (livreur.statutCompte !== 'ACTIF') throw conflit(`Le compte de ${livreur.nom} n'est pas actif`);
    if (!livreur.disponibilite) throw conflit(`${livreur.nom} n'est pas disponible actuellement`);
  }
  const parametres = await tarif.obtenirParametres(c);
  await c.query(
    'INSERT INTO livraisons (commande_id, livreur_id, montant) VALUES ($1, $2, $3)',
    [commande.id, livreur.id, tarif.calculerPartLivreur(commande.montant, parametres)]
  );
  options.livreur = livreur; // utilisé pour les notifications
}

// Distance réellement parcourue, calculée à partir des positions GPS reçues
async function enregistrerDistanceParcourue(c, commande) {
  const { rows } = await c.query(
    'SELECT latitude, longitude FROM positions_gps WHERE livraison_id = $1 ORDER BY date_heure, id',
    [commande.livraisonId]
  );
  const distance = rows.length >= 2 ? arrondir(longueurTrajetKm(rows)) : commande.distanceKm;
  await c.query('UPDATE livraisons SET distance_km = $1 WHERE id = $2', [distance, commande.livraisonId]);
}

async function enregistrerNote(c, commande, client, options) {
  if (options.note) {
    await c.query('UPDATE livraisons SET note_client = $1 WHERE id = $2', [options.note, commande.livraisonId]);
  }
}

// ── Cycle de vie : qui peut faire quoi, depuis quel statut ───────────
const ACTIONS = {
  valider: {
    roles: ['ADMIN'], depuis: ['NOUVELLE'], vers: 'VALIDEE',
    notifier: (c, cmd) => notifications.creer(c, [cmd.clientId],
      `Votre commande ${cmd.numero} a été validée. Un livreur va lui être affecté.`, cmd.id),
  },
  affecter: {
    roles: ['ADMIN'], depuis: ['VALIDEE'], vers: 'LIVREUR_AFFECTE',
    avant: affecterLivreur,
    notifier: async (c, cmd, u, o) => {
      await notifications.creer(c, [o.livreur.id],
        `La livraison ${cmd.numero} vous a été affectée. Acceptez-la ou refusez-la.`, cmd.id);
      await notifications.creer(c, [cmd.clientId],
        `Le livreur ${o.livreur.nom} a été affecté à votre commande ${cmd.numero}.`, cmd.id);
    },
  },
  accepter: {
    roles: ['LIVREUR'], depuis: ['LIVREUR_AFFECTE'], vers: 'ACCEPTEE',
    notifier: async (c, cmd, u) => {
      await notifications.creer(c, [cmd.clientId], `${nomComplet(u)} a accepté votre commande ${cmd.numero}.`, cmd.id);
      await notifications.notifierAdmins(c, `${nomComplet(u)} a accepté la livraison ${cmd.numero}.`, cmd.id);
    },
  },
  refuser: {
    roles: ['LIVREUR'], depuis: ['LIVREUR_AFFECTE'], vers: 'VALIDEE',
    notifier: (c, cmd, u, o) => notifications.notifierAdmins(c,
      `${nomComplet(u)} a refusé la livraison ${cmd.numero} (motif : ${o.motif}). Elle doit être réaffectée.`, cmd.id),
  },
  demarrer: {
    roles: ['LIVREUR'], depuis: ['ACCEPTEE'], vers: 'EN_COURS',
    notifier: (c, cmd) => notifications.creer(c, [cmd.clientId],
      `Votre commande ${cmd.numero} est en route. Suivez-la en temps réel sur la carte.`, cmd.id),
  },
  terminer: {
    roles: ['LIVREUR'], depuis: ['EN_COURS'], vers: 'LIVREE',
    apres: enregistrerDistanceParcourue,
    notifier: async (c, cmd, u) => {
      await notifications.creer(c, [cmd.clientId],
        `Votre commande ${cmd.numero} a été livrée. Merci de confirmer sa réception.`, cmd.id);
      await notifications.notifierAdmins(c, `La livraison ${cmd.numero} a été effectuée par ${nomComplet(u)}.`, cmd.id);
    },
  },
  confirmer: {
    roles: ['CLIENT'], depuis: ['LIVREE'], vers: 'CONFIRMEE',
    apres: enregistrerNote,
    notifier: async (c, cmd, u, o) => {
      const note = o.note ? ` Note attribuée : ${o.note}/5.` : '';
      await notifications.creer(c, [cmd.livreurId], `Le client a confirmé la réception de ${cmd.numero}.${note}`, cmd.id);
      await notifications.notifierAdmins(c, `La commande ${cmd.numero} est terminée (réception confirmée).`, cmd.id);
    },
  },
  annuler: {
    roles: ['CLIENT', 'ADMIN'],
    depuis: { CLIENT: ['NOUVELLE'], ADMIN: ['NOUVELLE', 'VALIDEE', 'LIVREUR_AFFECTE'] },
    vers: 'ANNULEE',
    notifier: async (c, cmd, u, o) => {
      const motif = o.motif ? ` (motif : ${o.motif})` : '';
      if (u.role === 'CLIENT') {
        await notifications.notifierAdmins(c, `${nomComplet(u)} a annulé la commande ${cmd.numero}${motif}.`, cmd.id);
      } else {
        await notifications.creer(c, [cmd.clientId], `Votre commande ${cmd.numero} a été annulée${motif}.`, cmd.id);
        await notifications.creer(c, [cmd.livreurId], `La livraison ${cmd.numero} a été annulée.`, cmd.id);
      }
    },
  },
};

async function executerAction(nomAction, commandeId, utilisateur, options = {}) {
  const action = ACTIONS[nomAction];
  if (!action.roles.includes(utilisateur.role)) throw interdit("Votre rôle ne permet pas cette action");

  await transaction(async (c) => {
    const { rows } = await c.query(
      `SELECT c.id, c.numero, c.statut, c.client_id, c.montant, c.distance_km,
              c.latitude_depart, c.longitude_depart, lv.id AS livraison_id, lv.livreur_id
       FROM commandes c LEFT JOIN livraisons lv ON lv.commande_id = c.id
       WHERE c.id = $1 FOR UPDATE OF c`,
      [commandeId]
    );
    const commande = camel(rows[0]);
    if (!commande || !peutVoir(commande, utilisateur)) throw introuvable('Commande introuvable');

    const statutsAutorises = Array.isArray(action.depuis) ? action.depuis : action.depuis[utilisateur.role];
    if (!statutsAutorises.includes(commande.statut)) {
      throw conflit(`Action impossible : la commande ${commande.numero} est au statut « ${LIBELLES_STATUT[commande.statut]} »`);
    }

    if (action.avant) await action.avant(c, commande, utilisateur, options);
    await c.query('UPDATE commandes SET statut = $1 WHERE id = $2', [action.vers, commande.id]);
    if (action.apres) await action.apres(c, commande, utilisateur, options);
    if (action.notifier) await action.notifier(c, commande, utilisateur, options);
  }, { utilisateurId: utilisateur.id, motif: options.motif });

  // Après un refus, le livreur n'a plus accès à la commande.
  return nomAction === 'refuser' ? null : obtenir(commandeId, utilisateur);
}

// ── Administration : compteurs par statut et export CSV ─────────────
async function compteurs() {
  const { rows } = await query('SELECT statut, count(*) AS n FROM commandes GROUP BY statut');
  const parStatut = Object.fromEntries(rows.map((r) => [r.statut, r.n]));
  return { total: rows.reduce((t, r) => t + r.n, 0), parStatut };
}

const LIMITE_EXPORT = 5000;
const celluleCsv = (v) => {
  const texte = v === null || v === undefined ? '' : String(v);
  return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
};

// CSV au format « Excel français » : séparateur « ; », virgule décimale, BOM UTF-8 pour les accents
async function exporterCsv(admin, filtres) {
  const { conditions, valeurs } = construireFiltres(admin, filtres);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT ${COLONNES} ${JOINTURES} ${where} ORDER BY c.date_creation DESC LIMIT ${LIMITE_EXPORT}`, valeurs
  );
  const decimal = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','));
  const entete = ['Numéro', 'Date', 'Client', 'Téléphone client', 'Départ', 'Arrivée', 'Zone', 'Type de colis',
    'Poids (kg)', 'Distance (km)', 'Montant (FCFA)', 'Statut', 'Livreur', 'Date de livraison'];
  const lignes = rows.map((r) => {
    const c = camel(r);
    return [c.numero, new Date(c.dateCreation).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }), c.clientNom,
      c.clientTelephone, c.adresseDepart, c.adresseArrivee, c.zone, c.typeColis, decimal(c.poidsKg),
      decimal(c.distanceKm), c.montant, LIBELLES_STATUT[c.statut], c.livreurNom || '',
      c.dateFin ? new Date(c.dateFin).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }) : ''].map(celluleCsv).join(';');
  });
  return `\uFEFF${[entete.join(';'), ...lignes].join('\r\n')}\r\n`;
}

module.exports = { lister, obtenir, creer, modifier, executerAction, peutVoir, compteurs, exporterCsv, ACTIONS };
