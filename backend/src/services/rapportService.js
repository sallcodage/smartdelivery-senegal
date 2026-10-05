// ─────────────────────────────────────────────────────────────────────
//  Rapports PDF (PDFKit) : activité globale, performance des livreurs, financier.
//  À chaque génération : calcul des KPI sur la période, écriture du PDF,
//  enregistrement du rapport et de ses KPI figés (table kpis).
// ─────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/app');
const { query, transaction } = require('../config/db');
const kpi = require('./kpiService');
const pdf = require('../utils/pdf');
const { camel } = require('../utils/format');
const { lirePagination, paginer } = require('../utils/pagination');
const { LIBELLES_STATUT } = require('../utils/constantes');
const { introuvable } = require('../utils/AppError');

const { fcfa, nombre, pourcent, decimal, duree, dateFr } = pdf.format;

const TYPES = {
  ACTIVITE_GLOBALE: { titre: "Rapport d'activité globale", fichier: 'activite' },
  PERFORMANCE_LIVREURS: { titre: 'Rapport de performance des livreurs', fichier: 'livreurs' },
  FINANCIER: { titre: 'Rapport financier', fichier: 'financier' },
};
const LIBELLES_COLIS = { DOCUMENTS: 'Documents', PRODUITS: 'Produits', NOURRITURE: 'Nourriture', AUTRES: 'Autres' };

// Regroupement des graphiques selon la durée de la période
function pasPourPeriode(debut, fin) {
  const jours = Math.round((new Date(fin) - new Date(debut)) / 86400000) + 1;
  if (jours <= 31) return 'day';
  return jours <= 120 ? 'week' : 'month';
}
function libelleTranche(date, pas) {
  const d = new Date(`${date}T00:00:00Z`);
  if (pas === 'month') return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}
const part = (n, total) => (total ? `${decimal((n / total) * 100)} %` : '—');

// ── Collecte des données (SQL) ───────────────────────────────────────
async function performancesLivreurs(debut, fin) {
  const filtre = "lv.statut IN ('LIVREE', 'CONFIRMEE') AND lv.date_fin >= $1::date AND lv.date_fin < $2::date + 1";
  const { rows } = await query(
    `SELECT u.prenom, u.nom, l.vehicule, u.statut_compte,
            count(lv.id) FILTER (WHERE ${filtre}) AS livraisons,
            coalesce(sum(lv.montant) FILTER (WHERE ${filtre}), 0) AS gains,
            coalesce(round(sum(lv.distance_km) FILTER (WHERE ${filtre}), 1), 0) AS distance_km,
            round(avg(extract(epoch FROM lv.date_fin - lv.date_debut) / 60) FILTER (WHERE ${filtre})) AS temps_moyen,
            round(avg(lv.note_client) FILTER (WHERE ${filtre}), 1) AS note,
            (SELECT count(*) FROM historique_statuts h WHERE h.auteur_id = u.id AND h.nouveau_statut = 'ACCEPTEE'
               AND h.date_changement >= $1::date AND h.date_changement < $2::date + 1) AS acceptees,
            (SELECT count(*) FROM historique_statuts h WHERE h.auteur_id = u.id AND h.ancien_statut = 'LIVREUR_AFFECTE'
               AND h.nouveau_statut = 'VALIDEE' AND h.date_changement >= $1::date AND h.date_changement < $2::date + 1) AS refusees
     FROM livreurs l JOIN utilisateurs u ON u.id = l.id
     LEFT JOIN livraisons lv ON lv.livreur_id = l.id
     WHERE u.statut_compte <> 'EN_ATTENTE'
     GROUP BY u.id, l.vehicule
     ORDER BY livraisons DESC, note DESC NULLS LAST, u.nom`,
    [debut, fin]
  );
  return rows.map(camel);
}

async function finances(debut, fin) {
  const periode = 'c.date_creation >= $1::date AND c.date_creation < $2::date + 1';
  const totaux = await query(
    `SELECT count(*) FILTER (WHERE c.statut = 'CONFIRMEE') AS commandes_confirmees,
            coalesce(sum(c.montant) FILTER (WHERE c.statut = 'CONFIRMEE'), 0) AS chiffre_affaires,
            coalesce(sum(lv.montant) FILTER (WHERE c.statut = 'CONFIRMEE'), 0) AS part_livreurs,
            count(*) FILTER (WHERE c.statut = 'LIVREE') AS livrees_non_confirmees,
            coalesce(sum(c.montant) FILTER (WHERE c.statut = 'LIVREE'), 0) AS montant_en_attente,
            coalesce(sum(c.montant) FILTER (WHERE c.statut = 'ANNULEE'), 0) AS montant_annule
     FROM commandes c LEFT JOIN livraisons lv ON lv.commande_id = c.id WHERE ${periode}`,
    [debut, fin]
  );
  const parZone = await query(
    `SELECT z.nom AS libelle, count(c.id) AS n, coalesce(sum(c.montant), 0) AS montant
     FROM zones z LEFT JOIN commandes c ON c.zone_id = z.id AND c.statut = 'CONFIRMEE' AND ${periode}
     GROUP BY z.nom ORDER BY montant DESC, z.nom`,
    [debut, fin]
  );
  const parColis = await query(
    `SELECT c.type_colis AS libelle, count(*) AS n, sum(c.montant) AS montant
     FROM commandes c WHERE c.statut = 'CONFIRMEE' AND ${periode} GROUP BY c.type_colis ORDER BY montant DESC`,
    [debut, fin]
  );
  const t = camel(totaux.rows[0]);
  return { ...t, partPlateforme: t.chiffreAffaires - t.partLivreurs, parZone: parZone.rows, parColis: parColis.rows };
}

async function collecter(type, debut, fin) {
  const pas = pasPourPeriode(debut, fin);
  const [indicateurs, comptes, evolution, repartitions] = await Promise.all([
    kpi.indicateurs(debut, fin), kpi.utilisateurs(), kpi.evolution(debut, pas, fin), kpi.repartitions(debut, fin),
  ]);
  const donnees = { pas, indicateurs, comptes, evolution, repartitions };
  if (type === 'ACTIVITE_GLOBALE') donnees.top = await kpi.topLivreurs(debut, 10, fin);
  if (type === 'PERFORMANCE_LIVREURS') donnees.livreurs = await performancesLivreurs(debut, fin);
  if (type === 'FINANCIER') donnees.finances = await finances(debut, fin);
  return donnees;
}

// ── Contenu de chaque type de rapport ────────────────────────────────
function ecrireActivite(doc, d) {
  const i = d.indicateurs;
  pdf.section(doc, 'Indicateurs clés');
  pdf.grilleKpi(doc, [
    { libelle: 'Commandes créées', valeur: nombre(i.totalCommandes) },
    { libelle: 'Livraisons effectuées', valeur: nombre(i.livrees) },
    { libelle: 'Taux de réussite', valeur: pourcent(i.tauxReussite) },
    { libelle: 'Temps moyen de livraison', valeur: duree(i.tempsLivraisonMinutes) },
    { libelle: 'Délai total moyen (commande à livraison)', valeur: duree(i.delaiTotalMinutes) },
    { libelle: 'Satisfaction client', valeur: i.noteMoyenne == null ? '—' : `${decimal(i.noteMoyenne)} / 5` },
    { libelle: "Chiffre d'affaires (commandes confirmées)", valeur: fcfa(i.chiffreAffaires) },
    { libelle: 'Commandes annulées', valeur: nombre(i.annulees) },
    { libelle: 'Clients inscrits / livreurs actifs', valeur: `${nombre(d.comptes.clients)} / ${nombre(d.comptes.livreursActifs)}` },
  ]);
  pdf.section(doc, 'Évolution des commandes');
  pdf.histogramme(doc, d.evolution.map((e) => ({ libelle: libelleTranche(e.date, d.pas), valeur: e.commandes })), {
    legende: `Commandes créées par ${{ day: 'jour', week: 'semaine', month: 'mois' }[d.pas]}.`,
  });
  const statuts = Object.entries(d.repartitions.statuts);
  const totalStatuts = statuts.reduce((t, [, n]) => t + n, 0);
  pdf.section(doc, 'Répartition par statut');
  pdf.tableau(doc, [{ titre: 'Statut', largeur: 3 }, { titre: 'Commandes', largeur: 1, align: 'right' }, { titre: 'Part', largeur: 1, align: 'right' }],
    statuts.sort((a, b) => b[1] - a[1]).map(([s, n]) => [LIBELLES_STATUT[s], nombre(n), part(n, totalStatuts)]));
  pdf.section(doc, 'Zones et types de colis');
  pdf.tableau(doc, [{ titre: 'Zone', largeur: 3 }, { titre: 'Commandes', largeur: 1, align: 'right' }, { titre: 'Part', largeur: 1, align: 'right' }],
    d.repartitions.zones.map((z) => [z.zone, nombre(z.n), pourcent(z.pourcentage)]));
  pdf.tableau(doc, [{ titre: 'Type de colis', largeur: 3 }, { titre: 'Commandes', largeur: 1, align: 'right' }, { titre: 'Part', largeur: 1, align: 'right' }],
    d.repartitions.typesColis.map((t) => [LIBELLES_COLIS[t.type] || t.type, nombre(t.n), pourcent(t.pourcentage)]));
  pdf.section(doc, 'Meilleurs livreurs de la période');
  pdf.tableau(doc, [{ titre: 'Rang', largeur: 0.6 }, { titre: 'Livreur', largeur: 3 }, { titre: 'Livraisons', largeur: 1.2, align: 'right' }, { titre: 'Distance', largeur: 1.2, align: 'right' }, { titre: 'Note', largeur: 1, align: 'right' }],
    d.top.map((l, k) => [k + 1, `${l.prenom} ${l.nom}`, nombre(l.livraisons), `${decimal(l.distanceKm)} km`, l.noteMoyenne == null ? '—' : `${decimal(l.noteMoyenne)} / 5`]));
}

function ecrirePerformance(doc, d) {
  const actifs = d.livreurs.filter((l) => l.livraisons > 0);
  const acceptees = d.livreurs.reduce((t, l) => t + l.acceptees, 0);
  const refusees = d.livreurs.reduce((t, l) => t + l.refusees, 0);
  pdf.section(doc, 'Synthèse');
  pdf.grilleKpi(doc, [
    { libelle: 'Livreurs ayant livré sur la période', valeur: `${actifs.length} / ${d.livreurs.length}` },
    { libelle: 'Livraisons effectuées', valeur: nombre(d.indicateurs.livrees) },
    { libelle: "Taux d'acceptation des affectations", valeur: acceptees + refusees ? pourcent(Math.round((acceptees / (acceptees + refusees)) * 1000) / 10) : '—' },
    { libelle: 'Temps moyen de livraison', valeur: duree(d.indicateurs.tempsLivraisonMinutes) },
    { libelle: 'Note moyenne des clients', valeur: d.indicateurs.noteMoyenne == null ? '—' : `${decimal(d.indicateurs.noteMoyenne)} / 5` },
    { libelle: 'Gains reversés aux livreurs', valeur: fcfa(d.livreurs.reduce((t, l) => t + l.gains, 0)) },
  ]);
  pdf.section(doc, 'Livraisons par livreur');
  pdf.histogramme(doc, actifs.slice(0, 12).map((l) => ({ libelle: `${l.prenom} ${l.nom.charAt(0)}.`, valeur: l.livraisons })),
    { legende: 'Les 12 livreurs les plus actifs de la période.' });
  pdf.section(doc, 'Détail par livreur');
  pdf.tableau(doc, [
    { titre: 'Livreur', largeur: 2.6 }, { titre: 'Livr.', largeur: 0.8, align: 'right' }, { titre: 'Accept.', largeur: 0.9, align: 'right' },
    { titre: 'Refus', largeur: 0.8, align: 'right' }, { titre: 'Temps moy.', largeur: 1.1, align: 'right' }, { titre: 'Distance', largeur: 1.1, align: 'right' },
    { titre: 'Note', largeur: 0.8, align: 'right' }, { titre: 'Gains', largeur: 1.4, align: 'right' },
  ], d.livreurs.map((l) => [
    `${l.prenom} ${l.nom}${l.statutCompte === 'INACTIF' ? ' (suspendu)' : ''}`, nombre(l.livraisons), nombre(l.acceptees), nombre(l.refusees),
    duree(l.tempsMoyen), `${decimal(l.distanceKm)} km`, l.note == null ? '—' : decimal(l.note), fcfa(l.gains),
  ]));
}

function ecrireFinancier(doc, d) {
  const f = d.finances;
  pdf.section(doc, 'Synthèse financière');
  pdf.grilleKpi(doc, [
    { libelle: "Chiffre d'affaires (commandes confirmées)", valeur: fcfa(f.chiffreAffaires) },
    { libelle: 'Commandes confirmées', valeur: nombre(f.commandesConfirmees) },
    { libelle: 'Panier moyen', valeur: fcfa(d.indicateurs.panierMoyen) },
    { libelle: 'Part reversée aux livreurs', valeur: fcfa(f.partLivreurs) },
    { libelle: 'Part de la plateforme', valeur: fcfa(f.partPlateforme) },
    { libelle: `En attente de confirmation (${f.livreesNonConfirmees} livrée(s))`, valeur: fcfa(f.montantEnAttente) },
  ]);
  pdf.section(doc, "Évolution du chiffre d'affaires");
  pdf.histogramme(doc, d.evolution.map((e) => ({ libelle: libelleTranche(e.date, d.pas), valeur: e.chiffreAffaires })), {
    legende: `Chiffre d'affaires confirmé par ${{ day: 'jour', week: 'semaine', month: 'mois' }[d.pas]} (date de livraison), en FCFA.`,
    formater: (v) => (v >= 1000 ? `${decimal(v / 1000)} k` : nombre(v)),
  });
  pdf.section(doc, "Chiffre d'affaires par zone");
  pdf.tableau(doc, [{ titre: 'Zone', largeur: 3 }, { titre: 'Commandes', largeur: 1, align: 'right' }, { titre: 'Montant', largeur: 1.5, align: 'right' }, { titre: 'Part', largeur: 1, align: 'right' }],
    f.parZone.map((z) => [z.libelle, nombre(z.n), fcfa(z.montant), part(z.montant, f.chiffreAffaires)]));
  pdf.section(doc, 'Chiffre d\'affaires par type de colis');
  pdf.tableau(doc, [{ titre: 'Type de colis', largeur: 3 }, { titre: 'Commandes', largeur: 1, align: 'right' }, { titre: 'Montant', largeur: 1.5, align: 'right' }, { titre: 'Part', largeur: 1, align: 'right' }],
    f.parColis.map((c) => [LIBELLES_COLIS[c.libelle] || c.libelle, nombre(c.n), fcfa(c.montant), part(c.montant, f.chiffreAffaires)]));
  pdf.section(doc, 'Montants non encaissés');
  pdf.paragraphes(doc, [
    `Commandes livrées en attente de confirmation par le client : ${fcfa(f.montantEnAttente)}.`,
    `Montant des commandes annulées sur la période : ${fcfa(f.montantAnnule)}.`,
  ]);
}

const DEFINITIONS = [
  'Période : commandes créées entre la date de début et la date de fin incluses (heure de Dakar, UTC+0).',
  "Chiffre d'affaires : somme des montants des commandes dont la réception a été confirmée par le client.",
  'Taux de réussite : livraisons effectuées ÷ (livraisons effectuées + commandes annulées après validation).',
  'Temps de livraison : durée entre le démarrage de la livraison par le livreur et la remise du colis.',
];

function ecrirePdf(chemin, type, donnees, meta) {
  return new Promise((resoudre, rejeter) => {
    const doc = pdf.nouveauDocument(TYPES[type].titre);
    const flux = fs.createWriteStream(chemin);
    flux.on('finish', resoudre);
    flux.on('error', rejeter);
    doc.on('error', rejeter);
    doc.pipe(flux);
    pdf.entete(doc, { titre: TYPES[type].titre, ...meta });
    ({ ACTIVITE_GLOBALE: ecrireActivite, PERFORMANCE_LIVREURS: ecrirePerformance, FINANCIER: ecrireFinancier })[type](doc, donnees);
    pdf.section(doc, 'Méthode de calcul');
    pdf.paragraphes(doc, DEFINITIONS);
    pdf.piedsDePage(doc);
    doc.end();
  });
}

// KPI figés au moment de la génération (table kpis)
function kpiAFiger(type, d) {
  const i = d.indicateurs;
  const liste = [
    ['Commandes créées', i.totalCommandes, 'commandes', 'Commandes créées sur la période'],
    ['Livraisons effectuées', i.livrees, 'livraisons', 'Commandes livrées ou confirmées'],
    ['Taux de réussite', i.tauxReussite, '%', 'Livrées ÷ (livrées + annulées après validation)'],
    ['Temps moyen de livraison', i.tempsLivraisonMinutes, 'min', 'Du démarrage à la remise du colis'],
    ["Chiffre d'affaires", i.chiffreAffaires, 'FCFA', 'Somme des commandes confirmées'],
    ['Note moyenne', i.noteMoyenne, '/5', 'Moyenne des notes des clients'],
  ];
  if (type === 'FINANCIER') {
    liste.push(['Part des livreurs', d.finances.partLivreurs, 'FCFA', 'Montant reversé aux livreurs'],
      ['Part de la plateforme', d.finances.partPlateforme, 'FCFA', "Chiffre d'affaires moins la part des livreurs"]);
  }
  if (type === 'PERFORMANCE_LIVREURS') {
    liste.push(['Livreurs actifs sur la période', d.livreurs.filter((l) => l.livraisons > 0).length, 'livreurs', 'Livreurs ayant effectué au moins une livraison']);
  }
  return liste.filter(([, valeur]) => valeur !== null && valeur !== undefined);
}

// ── API du service ───────────────────────────────────────────────────
async function generer({ type, periodeDebut, periodeFin }, admin) {
  const donnees = await collecter(type, periodeDebut, periodeFin);
  const id = crypto.randomUUID();
  const fichier = `rapport-${TYPES[type].fichier}-${periodeDebut}_${periodeFin}-${id.slice(0, 8)}.pdf`;
  await fs.promises.mkdir(config.dossierRapports, { recursive: true });
  const chemin = path.join(config.dossierRapports, fichier);
  const generation = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar', dateStyle: 'long', timeStyle: 'short' });

  await ecrirePdf(chemin, type, donnees, {
    periode: `du ${dateFr(periodeDebut)} au ${dateFr(periodeFin)}`, generation, auteur: `${admin.prenom} ${admin.nom}`,
  });
  try {
    await transaction(async (c) => {
      await c.query(
        `INSERT INTO rapports (id, type, periode_debut, periode_fin, fichier_url, administrateur_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, type, periodeDebut, periodeFin, fichier, admin.id]
      );
      for (const [nom, valeur, unite, description] of kpiAFiger(type, donnees)) {
        await c.query(
          `INSERT INTO kpis (rapport_id, nom, valeur, unite, periode_debut, periode_fin, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, nom, valeur, unite, periodeDebut, periodeFin, description]
        );
      }
    });
  } catch (err) {
    fs.unlink(chemin, () => {}); // pas de fichier orphelin
    throw err;
  }
  return obtenir(id);
}

const SELECT_RAPPORT = `
  SELECT r.id, r.type, to_char(r.periode_debut, 'YYYY-MM-DD') AS periode_debut, to_char(r.periode_fin, 'YYYY-MM-DD') AS periode_fin,
         r.fichier_url, r.date_generation, u.prenom || ' ' || u.nom AS auteur
  FROM rapports r LEFT JOIN utilisateurs u ON u.id = r.administrateur_id`;

function formater(ligne) {
  const r = camel(ligne);
  let taille = null;
  try { taille = fs.statSync(path.join(config.dossierRapports, r.fichierUrl)).size; } catch { /* fichier absent */ }
  const { fichierUrl, ...reste } = r;
  return { ...reste, titre: TYPES[r.type].titre, nomFichier: fichierUrl, tailleOctets: taille, disponible: taille !== null };
}

async function lister(filtres) {
  const pagination = lirePagination(filtres);
  const { rows } = await query(
    `SELECT * FROM (${SELECT_RAPPORT}) x
     WHERE ($1::type_rapport IS NULL OR x.type = $1)
     ORDER BY x.date_generation DESC LIMIT $2 OFFSET $3`,
    [filtres.type || null, pagination.limite, pagination.offset]
  );
  const total = (await query('SELECT count(*) AS n FROM rapports WHERE ($1::type_rapport IS NULL OR type = $1)', [filtres.type || null])).rows[0].n;
  return paginer(rows.map((r) => ({ ...formater(r), total })), pagination);
}

async function obtenir(id) {
  const { rows } = await query(`${SELECT_RAPPORT} WHERE r.id = $1`, [id]);
  if (!rows[0]) throw introuvable('Rapport introuvable');
  const kpis = await query(
    'SELECT nom, valeur, unite, description FROM kpis WHERE rapport_id = $1 ORDER BY date_calcul, nom', [id]
  );
  return { ...formater(rows[0]), kpis: kpis.rows };
}

async function fichierPdf(id) {
  const rapport = await obtenir(id);
  if (!rapport.disponible) throw introuvable('Fichier du rapport introuvable sur le serveur');
  return { chemin: path.join(config.dossierRapports, rapport.nomFichier), nom: rapport.nomFichier };
}

module.exports = { generer, lister, obtenir, fichierPdf, TYPES };
