// ─────────────────────────────────────────────────────────────────────
//  Indicateurs de performance (KPI) — calculés en SQL sur les données réelles.
//  Définitions validées (phase 1, point 13) :
//   • Taux de réussite = livrées ÷ (livrées + annulées APRÈS validation)
//   • Temps de livraison = date_fin − date_debut (démarrage → remise du colis)
//   • Chiffre d'affaires = somme des commandes CONFIRMÉES
//  La période porte sur la date de création des commandes (Dakar = UTC+0).
// ─────────────────────────────────────────────────────────────────────
const { query } = require('../config/db');
const { camel } = require('../utils/format');

// Période → date de début et regroupement des courbes
const PERIODES = {
  '7j': { jours: 7, pas: 'day' },
  '30j': { jours: 30, pas: 'day' },
  '90j': { jours: 90, pas: 'week' },
  '12m': { mois: 12, pas: 'month' },
  tout: { pas: 'month' },
};

async function debutPeriode(periode) {
  const p = PERIODES[periode];
  const auj = new Date(); auj.setUTCHours(0, 0, 0, 0);
  if (p.jours) { auj.setUTCDate(auj.getUTCDate() - (p.jours - 1)); return auj.toISOString().slice(0, 10); }
  if (p.mois) { auj.setUTCDate(1); auj.setUTCMonth(auj.getUTCMonth() - (p.mois - 1)); return auj.toISOString().slice(0, 10); }
  const { rows } = await query("SELECT to_char(date_trunc('month', min(date_creation)), 'YYYY-MM-DD') AS d FROM commandes");
  return rows[0].d || auj.toISOString().slice(0, 10);
}

// `fin` (facultative) : dernier jour inclus de la période (rapports)
const FILTRE_FIN = '($2::date IS NULL OR date_creation < $2::date + 1)';

async function indicateurs(debut, fin = null) {
  const { rows } = await query(
    `WITH c AS (SELECT * FROM commandes WHERE date_creation >= $1::date AND ${FILTRE_FIN})
     SELECT count(*) AS total_commandes,
            count(*) FILTER (WHERE statut = 'NOUVELLE') AS nouvelles,
            count(*) FILTER (WHERE statut IN ('VALIDEE', 'LIVREUR_AFFECTE', 'ACCEPTEE', 'EN_COURS')) AS en_cours,
            count(*) FILTER (WHERE statut IN ('LIVREE', 'CONFIRMEE')) AS livrees,
            count(*) FILTER (WHERE statut = 'CONFIRMEE') AS confirmees,
            count(*) FILTER (WHERE statut = 'ANNULEE') AS annulees,
            count(*) FILTER (WHERE statut = 'ANNULEE' AND EXISTS (
              SELECT 1 FROM historique_statuts h WHERE h.commande_id = c.id AND h.nouveau_statut = 'VALIDEE')) AS annulees_apres_validation,
            coalesce(sum(montant) FILTER (WHERE statut = 'CONFIRMEE'), 0) AS chiffre_affaires,
            round(avg(montant) FILTER (WHERE statut = 'CONFIRMEE')) AS panier_moyen,
            (SELECT round(avg(extract(epoch FROM l.date_fin - l.date_debut)) / 60)
               FROM livraisons l JOIN c x ON x.id = l.commande_id WHERE l.date_fin IS NOT NULL) AS temps_livraison_minutes,
            (SELECT round(avg(extract(epoch FROM l.date_fin - x.date_creation)) / 60)
               FROM livraisons l JOIN c x ON x.id = l.commande_id WHERE l.date_fin IS NOT NULL) AS delai_total_minutes,
            (SELECT round(avg(l.note_client), 1) FROM livraisons l JOIN c x ON x.id = l.commande_id) AS note_moyenne,
            (SELECT count(l.note_client) FROM livraisons l JOIN c x ON x.id = l.commande_id) AS nombre_notes
     FROM c`,
    [debut, fin]
  );
  const r = camel(rows[0]);
  const base = r.livrees + r.annuleesApresValidation;
  return { ...r, tauxReussite: base ? Math.round((r.livrees / base) * 1000) / 10 : null };
}

async function utilisateurs() {
  const { rows } = await query(
    `SELECT count(*) FILTER (WHERE u.role = 'CLIENT') AS clients,
            count(*) FILTER (WHERE u.role = 'LIVREUR') AS livreurs,
            count(*) FILTER (WHERE u.role = 'LIVREUR' AND u.statut_compte = 'ACTIF') AS livreurs_actifs,
            count(*) FILTER (WHERE u.role = 'LIVREUR' AND u.statut_compte = 'ACTIF' AND l.disponibilite) AS livreurs_disponibles,
            count(*) FILTER (WHERE u.role = 'LIVREUR' AND u.statut_compte = 'EN_ATTENTE') AS livreurs_en_attente
     FROM utilisateurs u LEFT JOIN livreurs l ON l.id = u.id`
  );
  return camel(rows[0]);
}

// Courbes : commandes créées, livrées et chiffre d'affaires par jour, semaine ou mois
async function evolution(debut, pas, fin = null) {
  const { rows } = await query(
    `WITH tranches AS (
       SELECT generate_series(date_trunc($2, $1::date), date_trunc($2, coalesce($3::date, current_date)), ('1 ' || $2)::interval) AS debut
     )
     SELECT to_char(t.debut, 'YYYY-MM-DD') AS date,
            (SELECT count(*) FROM commandes c WHERE date_trunc($2, c.date_creation) = t.debut AND c.date_creation >= $1::date
              AND ($3::date IS NULL OR c.date_creation < $3::date + 1)) AS commandes,
            (SELECT count(*) FROM livraisons l WHERE l.statut IN ('LIVREE', 'CONFIRMEE') AND date_trunc($2, l.date_fin) = t.debut AND l.date_fin >= $1::date
              AND ($3::date IS NULL OR l.date_fin < $3::date + 1)) AS livrees,
            (SELECT coalesce(sum(c.montant), 0) FROM commandes c JOIN livraisons l ON l.commande_id = c.id
              WHERE c.statut = 'CONFIRMEE' AND date_trunc($2, l.date_fin) = t.debut AND l.date_fin >= $1::date
              AND ($3::date IS NULL OR l.date_fin < $3::date + 1)) AS chiffre_affaires
     FROM tranches t ORDER BY t.debut`,
    [debut, pas, fin]
  );
  return rows.map(camel);
}

async function repartitions(debut, fin = null) {
  const statuts = await query(
    `SELECT statut, count(*) AS n FROM commandes WHERE date_creation >= $1::date AND ${FILTRE_FIN} GROUP BY statut`, [debut, fin]
  );
  const colis = await query(
    `SELECT type_colis AS type, count(*) AS n FROM commandes WHERE date_creation >= $1::date AND ${FILTRE_FIN}
     GROUP BY type_colis ORDER BY n DESC`, [debut, fin]
  );
  const zones = await query(
    `SELECT z.nom AS zone, count(c.id) AS n
     FROM zones z LEFT JOIN commandes c ON c.zone_id = z.id AND c.date_creation >= $1::date
       AND ($2::date IS NULL OR c.date_creation < $2::date + 1)
     GROUP BY z.nom ORDER BY n DESC, z.nom`,
    [debut, fin]
  );
  const total = (lignes) => lignes.reduce((t, l) => t + l.n, 0);
  const avecPourcentage = (lignes) => {
    const t = total(lignes);
    return lignes.map((l) => ({ ...l, pourcentage: t ? Math.round((l.n / t) * 1000) / 10 : 0 }));
  };
  return {
    statuts: Object.fromEntries(statuts.rows.map((r) => [r.statut, r.n])),
    typesColis: avecPourcentage(colis.rows),
    zones: avecPourcentage(zones.rows),
  };
}

async function topLivreurs(debut, limite = 5, fin = null) {
  const { rows } = await query(
    `SELECT u.id, u.prenom, u.nom, u.photo_url, count(lv.id) AS livraisons,
            coalesce(round(sum(lv.distance_km), 1), 0) AS distance_km,
            round(avg(lv.note_client), 1) AS note_moyenne
     FROM livraisons lv JOIN utilisateurs u ON u.id = lv.livreur_id
     WHERE lv.statut IN ('LIVREE', 'CONFIRMEE') AND lv.date_fin >= $1::date
       AND ($3::date IS NULL OR lv.date_fin < $3::date + 1)
     GROUP BY u.id ORDER BY livraisons DESC, note_moyenne DESC NULLS LAST LIMIT $2`,
    [debut, limite, fin]
  );
  return rows.map(camel);
}

async function tableauDeBord(periode = '30j') {
  const debut = await debutPeriode(periode);
  const [kpi, comptes, courbe, parts, top] = await Promise.all([
    indicateurs(debut), utilisateurs(), evolution(debut, PERIODES[periode].pas), repartitions(debut), topLivreurs(debut),
  ]);
  return { periode, debut, pas: PERIODES[periode].pas, indicateurs: { ...kpi, ...comptes }, evolution: courbe, ...parts, topLivreurs: top };
}

module.exports = { tableauDeBord, indicateurs, utilisateurs, evolution, repartitions, topLivreurs, debutPeriode, PERIODES };
