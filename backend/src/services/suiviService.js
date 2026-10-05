// Géolocalisation : positions GPS pendant la livraison et suivi sur carte.
const { query, transaction } = require('../config/db');
const { camel } = require('../utils/format');
const { distanceKm, longueurTrajetKm, arrondir } = require('../utils/geo');
const { LIBELLES_STATUT } = require('../utils/constantes');
const commandes = require('./commandeService');
const { introuvable, conflit } = require('../utils/AppError');

async function enregistrerPosition(commandeId, livreur, { latitude, longitude }) {
  return transaction(async (c) => {
    const { rows } = await c.query(
      `SELECT c.statut, c.latitude_arrivee, c.longitude_arrivee, lv.id AS livraison_id, lv.livreur_id
       FROM commandes c JOIN livraisons lv ON lv.commande_id = c.id WHERE c.id = $1`,
      [commandeId]
    );
    const cmd = camel(rows[0]);
    if (!cmd || cmd.livreurId !== livreur.id) throw introuvable('Livraison introuvable');
    if (cmd.statut !== 'EN_COURS') throw conflit('La position ne peut être transmise que pendant une livraison en cours');

    const insertion = await c.query(
      'INSERT INTO positions_gps (livraison_id, latitude, longitude) VALUES ($1, $2, $3) RETURNING latitude, longitude, date_heure',
      [cmd.livraisonId, latitude, longitude]
    );
    await c.query(
      'UPDATE livreurs SET latitude_actuelle = $1, longitude_actuelle = $2, date_position = now() WHERE id = $3',
      [latitude, longitude, livreur.id]
    );
    return {
      ...camel(insertion.rows[0]),
      distanceRestanteKm: arrondir(distanceKm(latitude, longitude, cmd.latitudeArrivee, cmd.longitudeArrivee)),
    };
  });
}

async function suivre(commandeId, utilisateur) {
  const commande = await commandes.obtenir(commandeId, utilisateur); // contrôle d'accès inclus
  if (!commande.livraison) {
    return { commande, positions: [], dernierePosition: null, distanceParcourueKm: 0, distanceRestanteKm: commande.distanceKm };
  }
  const { rows } = await query(
    'SELECT latitude, longitude, date_heure FROM positions_gps WHERE livraison_id = $1 ORDER BY date_heure, id',
    [commande.livraison.id]
  );
  const positions = rows.map(camel);
  const derniere = positions.at(-1) || null;
  return {
    commande,
    positions,
    dernierePosition: derniere,
    distanceParcourueKm: arrondir(longueurTrajetKm(positions)),
    distanceRestanteKm: derniere
      ? arrondir(distanceKm(derniere.latitude, derniere.longitude, commande.arrivee.latitude, commande.arrivee.longitude))
      : commande.distanceKm,
  };
}

// Vue administrateur : toutes les livraisons en cours avec la dernière position connue
async function livraisonsActives() {
  const { rows } = await query(
    `SELECT c.id, c.numero, c.statut, c.adresse_depart, c.latitude_depart, c.longitude_depart,
            c.adresse_arrivee, c.latitude_arrivee, c.longitude_arrivee,
            uc.prenom || ' ' || uc.nom AS client_nom,
            lv.livreur_id, ul.prenom || ' ' || ul.nom AS livreur_nom, ul.telephone AS livreur_telephone,
            p.latitude AS derniere_latitude, p.longitude AS derniere_longitude, p.date_heure AS derniere_position_le,
            lr.latitude_actuelle, lr.longitude_actuelle, lr.date_position
     FROM commandes c
     JOIN utilisateurs uc ON uc.id = c.client_id
     JOIN livraisons lv   ON lv.commande_id = c.id
     JOIN utilisateurs ul ON ul.id = lv.livreur_id
     JOIN livreurs lr     ON lr.id = lv.livreur_id
     LEFT JOIN LATERAL (SELECT latitude, longitude, date_heure FROM positions_gps
                        WHERE livraison_id = lv.id ORDER BY date_heure DESC, id DESC LIMIT 1) p ON true
     WHERE c.statut IN ('LIVREUR_AFFECTE', 'ACCEPTEE', 'EN_COURS')
     ORDER BY c.date_creation`
  );
  return rows.map((r) => {
    const l = camel(r);
    return {
      id: l.id, numero: l.numero, statut: l.statut, libelleStatut: LIBELLES_STATUT[l.statut],
      depart: { adresse: l.adresseDepart, latitude: l.latitudeDepart, longitude: l.longitudeDepart },
      arrivee: { adresse: l.adresseArrivee, latitude: l.latitudeArrivee, longitude: l.longitudeArrivee },
      client: { nom: l.clientNom },
      livreur: { id: l.livreurId, nom: l.livreurNom, telephone: l.livreurTelephone },
      dernierePosition: l.derniereLatitude === null ? null
        : { latitude: l.derniereLatitude, longitude: l.derniereLongitude, dateHeure: l.dernierePositionLe },
      // Pour la carte : position du trajet en cours, sinon dernière position connue du livreur
      positionLivreur: l.derniereLatitude !== null
        ? { latitude: l.derniereLatitude, longitude: l.derniereLongitude, dateHeure: l.dernierePositionLe, source: 'LIVRAISON' }
        : l.latitudeActuelle !== null
          ? { latitude: l.latitudeActuelle, longitude: l.longitudeActuelle, dateHeure: l.datePosition, source: 'DERNIERE_CONNUE' }
          : null,
    };
  });
}

module.exports = { enregistrerPosition, suivre, livraisonsActives };
