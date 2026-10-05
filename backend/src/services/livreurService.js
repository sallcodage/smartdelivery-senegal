const { query } = require('../config/db');
const { camel } = require('../utils/format');
const { urlFichier } = require('../utils/utilisateurs');

// État affiché dans le prototype : Disponible / En livraison / Hors ligne
function etatActivite(l) {
  if (l.livraisonsActives > 0) return 'EN_LIVRAISON';
  return l.disponibilite ? 'DISPONIBLE' : 'HORS_LIGNE';
}

async function listerPourAdmin(filtres = {}) {
  const { rows } = await query(
    `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.statut_compte, u.photo_url, u.date_creation,
            l.vehicule, l.numero_permis, l.disponibilite, l.note_moyenne, l.nombre_evaluations,
            l.latitude_actuelle, l.longitude_actuelle, l.date_position,
            count(lv.id) FILTER (WHERE lv.statut IN ('LIVREE', 'CONFIRMEE'))           AS livraisons_effectuees,
            count(lv.id) FILTER (WHERE lv.statut IN ('AFFECTEE', 'ACCEPTEE', 'EN_COURS')) AS livraisons_actives
     FROM livreurs l
     JOIN utilisateurs u ON u.id = l.id
     LEFT JOIN livraisons lv ON lv.livreur_id = l.id
     WHERE ($1::boolean IS NULL OR (l.disponibilite = $1 AND u.statut_compte = 'ACTIF'))
       AND ($2::text IS NULL OR (u.nom || ' ' || u.prenom || ' ' || u.telephone) ILIKE '%' || $2 || '%')
     GROUP BY u.id, l.id
     ORDER BY u.nom, u.prenom`,
    [filtres.disponible ?? null, filtres.recherche || null]
  );
  return rows.map((r) => {
    const l = camel(r);
    return { ...l, photoUrl: urlFichier(l.photoUrl), etat: etatActivite(l) };
  });
}

async function modifierDisponibilite(id, disponibilite) {
  const { rows } = await query(
    'UPDATE livreurs SET disponibilite = $1 WHERE id = $2 RETURNING disponibilite', [disponibilite, id]
  );
  return rows[0];
}

async function mettreAJourPosition(id, { latitude, longitude }) {
  const { rows } = await query(
    `UPDATE livreurs SET latitude_actuelle = $1, longitude_actuelle = $2, date_position = now()
     WHERE id = $3 RETURNING latitude_actuelle, longitude_actuelle, date_position`,
    [latitude, longitude, id]
  );
  return camel(rows[0]);
}

// ─────────────────────────────────────────────────────────────────────
//  Performances d'un livreur, calculées en SQL sur les données réelles.
//  Période : 7 derniers jours, 30 derniers jours ou tout l'historique.
// ─────────────────────────────────────────────────────────────────────
const PERIODES = { '7j': 7, '30j': 30, tout: null };

async function performances(livreurId, periode = '30j') {
  const jours = PERIODES[periode];
  // Début de période (NULL = depuis toujours) ; la courbe couvre au moins 30 jours pour « tout »
  const debut = jours ? `current_date - ${jours - 1}` : 'NULL::date';
  const joursCourbe = jours || 30;

  const { rows } = await query(
    `WITH livrees AS (
       SELECT * FROM livraisons
       WHERE livreur_id = $1 AND statut IN ('LIVREE', 'CONFIRMEE')
         AND (${debut} IS NULL OR date_fin >= ${debut})
     ),
     decisions AS (
       SELECT count(*) FILTER (WHERE nouveau_statut = 'ACCEPTEE') AS acceptees,
              count(*) FILTER (WHERE ancien_statut = 'LIVREUR_AFFECTE' AND nouveau_statut = 'VALIDEE') AS refusees
       FROM historique_statuts
       WHERE auteur_id = $1 AND (${debut} IS NULL OR date_changement >= ${debut})
     )
     SELECT
       (SELECT count(*) FROM livrees)                                                    AS livraisons_effectuees,
       (SELECT coalesce(sum(montant), 0) FROM livrees)                                   AS gains,
       (SELECT coalesce(round(sum(distance_km), 2), 0) FROM livrees)                     AS distance_km,
       (SELECT round(avg(extract(epoch FROM date_fin - date_debut)) / 60) FROM livrees)  AS temps_moyen_minutes,
       (SELECT round(avg(note_client), 1) FROM livrees)                                  AS note_periode,
       d.acceptees, d.refusees,
       (SELECT count(*) FROM livraisons
         WHERE livreur_id = $1 AND statut IN ('AFFECTEE', 'ACCEPTEE', 'EN_COURS'))       AS livraisons_actives,
       l.note_moyenne, l.nombre_evaluations
     FROM decisions d, livreurs l WHERE l.id = $1`,
    [livreurId]
  );
  const r = camel(rows[0]);
  const decisions = r.acceptees + r.refusees;

  const courbe = await query(
    `SELECT jour::date AS date,
            count(l.id) AS livraisons,
            coalesce(sum(l.montant), 0) AS gains
     FROM generate_series(current_date - ($2::int - 1), current_date, interval '1 day') AS jour
     LEFT JOIN livraisons l ON l.livreur_id = $1 AND l.statut IN ('LIVREE', 'CONFIRMEE') AND l.date_fin::date = jour::date
     GROUP BY jour ORDER BY jour`,
    [livreurId, joursCourbe]
  );

  return {
    periode,
    livraisonsEffectuees: r.livraisonsEffectuees,
    gains: r.gains,
    distanceKm: r.distanceKm,
    tempsMoyenMinutes: r.tempsMoyenMinutes,
    notePeriode: r.notePeriode,
    noteMoyenne: r.noteMoyenne,
    nombreEvaluations: r.nombreEvaluations,
    acceptees: r.acceptees,
    refusees: r.refusees,
    tauxAcceptation: decisions ? Math.round((r.acceptees / decisions) * 100) : null,
    livraisonsActives: r.livraisonsActives,
    parJour: courbe.rows.map((j) => ({ date: j.date, livraisons: j.livraisons, gains: j.gains })),
  };
}

module.exports = { listerPourAdmin, modifierDisponibilite, mettreAJourPosition, etatActivite, performances, PERIODES };
