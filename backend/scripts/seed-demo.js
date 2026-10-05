// ─────────────────────────────────────────────────────────────────────
//  SEED DE DÉMONSTRATION — données FICTIVES et réalistes (contexte sénégalais)
//
//  npm run db:seed                         crée les données (refuse si elles existent déjà)
//  npm run db:seed -- --remplacer          supprime UNIQUEMENT les données de démo puis les recrée
//  npm run db:seed -- --supprimer          supprime uniquement les données de démo
//  Options : --commandes=600  --jours=90
//
//  Principe : chaque commande parcourt le VRAI cycle via les services du backend
//  (mêmes triggers, historique et notifications que l'application), puis ses dates
//  sont réparties sur la période (les triggers figent le contenu, pas les dates).
//  Toutes les données de démo sont rattachées à des comptes @demo.smartdelivery.sn.
// ─────────────────────────────────────────────────────────────────────
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../src/config/app');
const { pool, query, transaction } = require('../src/config/db');
const commandes = require('../src/services/commandeService');
const suivi = require('../src/services/suiviService');
const rapports = require('../src/services/rapportService');
const kpi = require('../src/services/kpiService');
const { repondreEnSecours } = require('../src/services/ia/secours');
const D = require('../database/seed/donnees-demo');

const MOTIF_EMAIL = `%@${D.DOMAINE_DEMO}`;
const MINUTE = 60 * 1000;
const JOUR = 24 * 60 * MINUTE;

// ── Hasard reproductible (même jeu de données à chaque exécution) ─────
function generateur(graine) {
  let a = graine;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let alea = generateur(2026);
const entre = (a, b) => a + alea() * (b - a);
const entier = (a, b) => Math.floor(entre(a, b + 1));
const choisir = (t) => t[Math.floor(alea() * t.length)];
function pondere(elements, poids) {
  const total = poids.reduce((s, p) => s + p, 0);
  let r = alea() * total;
  for (let i = 0; i < elements.length; i++) { r -= poids[i]; if (r <= 0) return elements[i]; }
  return elements.at(-1);
}
const sansAccents = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── 1. Analyse du schéma réel ────────────────────────────────────────
const TABLES = ['utilisateurs', 'clients', 'livreurs', 'administrateurs', 'zones', 'parametres_tarification', 'commandes',
  'livraisons', 'positions_gps', 'historique_statuts', 'notifications', 'conversations_ia', 'rapports', 'kpis',
  'reinitialisations_mot_de_passe'];
const ENUMS = {
  role_utilisateur: ['CLIENT', 'LIVREUR', 'ADMIN'],
  statut_compte: ['ACTIF', 'INACTIF', 'EN_ATTENTE'],
  type_vehicule: ['MOTO', 'SCOOTER', 'VELO', 'VOITURE'],
  type_colis: ['DOCUMENTS', 'PRODUITS', 'NOURRITURE', 'AUTRES'],
  statut_commande: ['NOUVELLE', 'VALIDEE', 'LIVREUR_AFFECTE', 'ACCEPTEE', 'EN_COURS', 'LIVREE', 'CONFIRMEE', 'ANNULEE'],
};
const TRIGGERS = ['trg_commandes_insert', 'trg_commandes_update', 'trg_commandes_historique_update', 'trg_livraisons_insert',
  'trg_positions_insert', 'trg_livraisons_note'];

async function analyserSchema() {
  const problemes = [];
  const t = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  const presentes = new Set(t.rows.map((r) => r.table_name));
  TABLES.filter((x) => !presentes.has(x)).forEach((x) => problemes.push(`table manquante : ${x}`));
  const e = await query(`SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS valeurs
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid GROUP BY t.typname`);
  const enums = Object.fromEntries(e.rows.map((r) => [r.typname, r.valeurs]));
  for (const [nom, valeurs] of Object.entries(ENUMS)) {
    const manquantes = valeurs.filter((v) => !(enums[nom] || []).includes(v));
    if (manquantes.length) problemes.push(`type ${nom} : valeurs absentes ${manquantes.join(', ')}`);
  }
  const g = await query('SELECT tgname FROM pg_trigger WHERE NOT tgisinternal');
  const triggers = new Set(g.rows.map((r) => r.tgname));
  TRIGGERS.filter((x) => !triggers.has(x)).forEach((x) => problemes.push(`trigger manquant : ${x}`));
  if (problemes.length) {
    throw new Error(`Le schéma ne correspond pas à SmartDelivery :\n  - ${problemes.join('\n  - ')}\nLancez d'abord « npm run db:init ».`);
  }
  const z = await query('SELECT id, nom FROM zones');
  const zones = Object.fromEntries(z.rows.map((r) => [r.nom, r.id]));
  const manquantes = [...new Set(D.LIEUX.map((l) => l[3]))].filter((n) => !zones[n]);
  if (manquantes.length) throw new Error(`Zones absentes de la table zones : ${manquantes.join(', ')}`);
  if ((await query('SELECT count(*) AS n FROM parametres_tarification')).rows[0].n !== 1) {
    throw new Error('Paramètres de tarification absents : lancez « npm run db:init ».');
  }
  return { zones, tables: TABLES.length, enums: Object.keys(ENUMS).length, triggers: TRIGGERS.length };
}

// ── 2. Données de démo existantes : détection et suppression contrôlée ─
async function compterDemo() {
  const { rows } = await query('SELECT count(*) AS n FROM utilisateurs WHERE email LIKE $1', [MOTIF_EMAIL]);
  return rows[0].n;
}

async function supprimerDemo(journal = console.log) {
  const fichiers = await transaction(async (c) => {
    const demo = "(SELECT id FROM utilisateurs WHERE email LIKE $1)";
    // Garde-fou : ne jamais supprimer une livraison réelle effectuée par un livreur de démo
    const { rows: conflits } = await c.query(
      `SELECT c.numero FROM livraisons lv JOIN commandes c ON c.id = lv.commande_id
       WHERE lv.livreur_id IN ${demo} AND c.client_id NOT IN ${demo}`, [MOTIF_EMAIL]);
    if (conflits.length) {
      throw new Error(`Suppression annulée : des commandes réelles (${conflits.map((r) => r.numero).slice(0, 5).join(', ')}…) `
        + 'ont été livrées par un livreur de démo. Rien n\'a été supprimé.');
    }
    const { rows: rap } = await c.query(`DELETE FROM rapports WHERE administrateur_id IN ${demo} RETURNING fichier_url`, [MOTIF_EMAIL]);
    await c.query(`DELETE FROM notifications WHERE commande_id IN (SELECT id FROM commandes WHERE client_id IN ${demo})`, [MOTIF_EMAIL]);
    const cmd = await c.query(`DELETE FROM commandes WHERE client_id IN ${demo}`, [MOTIF_EMAIL]);
    const usr = await c.query('DELETE FROM utilisateurs WHERE email LIKE $1', [MOTIF_EMAIL]);
    journal(`Données de démo supprimées : ${usr.rowCount} comptes, ${cmd.rowCount} commandes, ${rap.length} rapports.`);
    return rap.map((r) => r.fichier_url);
  });
  fichiers.forEach((f) => fs.rm(path.join(config.dossierRapports, f), { force: true }, () => {}));
}

// ── 3. Comptes ───────────────────────────────────────────────────────
function motDePasseDemo() {
  const fourni = process.env.DEMO_MOT_DE_PASSE;
  if (fourni) {
    if (fourni.length < 8 || !/[A-Za-z]/.test(fourni) || !/\d/.test(fourni)) {
      throw new Error('DEMO_MOT_DE_PASSE doit contenir au moins 8 caractères, dont une lettre et un chiffre.');
    }
    return { valeur: fourni, genere: false };
  }
  return { valeur: `Demo-${crypto.randomBytes(3).toString('hex')}-${entier(10, 99)}`, genere: true };
}

async function creerCompte(c, u) {
  const { rows } = await c.query(
    `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone, role, statut_compte, date_creation)
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIF', $7) RETURNING id`,
    [u.nom, u.prenom, u.email, u.hash, u.telephone, u.role, u.dateCreation]
  );
  const id = rows[0].id;
  if (u.role === 'CLIENT') await c.query('INSERT INTO clients (id, adresse) VALUES ($1, $2)', [id, u.adresse]);
  if (u.role === 'ADMIN') await c.query('INSERT INTO administrateurs (id) VALUES ($1)', [id]);
  if (u.role === 'LIVREUR') {
    await c.query('INSERT INTO livreurs (id, vehicule, numero_permis, disponibilite) VALUES ($1, $2, $3, true)', [id, u.vehicule, u.permis]);
  }
  return { ...u, id };
}

async function creerComptes(opts, debutPeriode) {
  const existants = new Set((await query('SELECT telephone FROM utilisateurs')).rows.map((r) => r.telephone));
  let compteur = 0;
  const telephone = () => {
    let t;
    do { compteur += 1; t = `${choisir(['77', '78', '76', '70'])}000${String(compteur).padStart(4, '0')}`; } while (existants.has(t));
    existants.add(t);
    return t;
  };
  const emails = new Set();
  const email = (prenom, nom) => {
    const base = `${sansAccents(prenom)}.${sansAccents(nom)}`;
    let e = `${base}@${D.DOMAINE_DEMO}`; let n = 1;
    while (emails.has(e)) { n += 1; e = `${base}${n}@${D.DOMAINE_DEMO}`; }
    emails.add(e);
    return e;
  };
  const personne = () => {
    const femme = alea() < 0.5;
    return { prenom: choisir(femme ? D.PRENOMS_F : D.PRENOMS_H), nom: choisir(D.NOMS) };
  };
  // Comptes « figurants » : mot de passe aléatoire jamais affiché, donc aucune connexion possible
  const hashFigurant = await bcrypt.hash(crypto.randomBytes(24).toString('base64'), config.bcryptCout);
  const hashDemo = await bcrypt.hash(opts.motDePasse, config.bcryptCout);
  const avant = (j) => new Date(debutPeriode.getTime() - j * JOUR);
  const lieu = () => pondere(D.LIEUX, D.LIEUX.map((l) => l[4]));
  const vehicule = () => pondere(['MOTO', 'SCOOTER', 'VOITURE', 'VELO'], [60, 20, 12, 8]);
  let permis = 0;
  const numeroPermis = () => { permis += 1; return `DK-DEMO-${String(permis).padStart(4, '0')}`; };

  return transaction(async (c) => {
    const comptes = { admins: [], clients: [], livreurs: [], enAttente: [] };
    comptes.demoAdmin = await creerCompte(c, { prenom: 'Khadija', nom: 'Démo', email: `admin.demo@${D.DOMAINE_DEMO}`, telephone: telephone(), role: 'ADMIN', hash: hashDemo, dateCreation: avant(60) });
    comptes.admins.push(comptes.demoAdmin);
    const p = personne();
    comptes.admins.push(await creerCompte(c, { ...p, email: email(p.prenom, p.nom), telephone: telephone(), role: 'ADMIN', hash: hashFigurant, dateCreation: avant(55) }));

    const lieuDemo = D.LIEUX.find((l) => l[0].startsWith('Médina'));
    comptes.demoClient = await creerCompte(c, { prenom: 'Awa', nom: 'Démo', email: `client.demo@${D.DOMAINE_DEMO}`, telephone: telephone(), role: 'CLIENT', hash: hashDemo, adresse: lieuDemo[0], lieu: lieuDemo, dateCreation: avant(20) });
    comptes.clients.push(comptes.demoClient);
    for (let i = 0; i < opts.clients; i++) {
      const q = personne(); const l = lieu();
      comptes.clients.push(await creerCompte(c, { ...q, email: email(q.prenom, q.nom), telephone: telephone(), role: 'CLIENT', hash: hashFigurant, adresse: l[0] + choisir(D.REPERES), lieu: l, dateCreation: avant(entier(1, 30)) }));
    }

    const lieuLivreur = D.LIEUX.find((l) => l[0].startsWith('Colobane'));
    comptes.demoLivreur = await creerCompte(c, { prenom: 'Moussa', nom: 'Démo', email: `livreur.demo@${D.DOMAINE_DEMO}`, telephone: telephone(), role: 'LIVREUR', hash: hashDemo, vehicule: 'MOTO', permis: numeroPermis(), lieu: lieuLivreur, dateCreation: avant(45) });
    comptes.livreurs.push(comptes.demoLivreur);
    for (let i = 0; i < opts.livreurs; i++) {
      const q = { prenom: choisir(D.PRENOMS_H.concat(D.PRENOMS_F.slice(0, 5))), nom: choisir(D.NOMS) };
      comptes.livreurs.push(await creerCompte(c, { ...q, email: email(q.prenom, q.nom), telephone: telephone(), role: 'LIVREUR', hash: hashFigurant, vehicule: vehicule(), permis: numeroPermis(), lieu: lieu(), dateCreation: avant(entier(10, 40)) }));
    }
    // Inscriptions de livreurs en attente de validation (aucune activité)
    for (let i = 0; i < 2; i++) {
      const q = personne();
      const l = await creerCompte(c, { ...q, email: email(q.prenom, q.nom), telephone: telephone(), role: 'LIVREUR', hash: hashFigurant, vehicule: vehicule(), permis: numeroPermis(), dateCreation: new Date(Date.now() - entier(1, 3) * JOUR) });
      await c.query("UPDATE utilisateurs SET statut_compte = 'EN_ATTENTE' WHERE id = $1", [l.id]);
      await c.query('UPDATE livreurs SET disponibilite = false WHERE id = $1', [l.id]);
      comptes.enAttente.push(l);
    }
    return comptes;
  });
}

// ── 4. Planification des commandes sur la période ────────────────────
const TYPES = ['PRODUITS', 'NOURRITURE', 'DOCUMENTS', 'AUTRES'];
const POIDS = { DOCUMENTS: [0.1, 1], NOURRITURE: [0.5, 5], PRODUITS: [0.5, 15], AUTRES: [1, 20] };

function planifier(opts, comptes) {
  const maintenant = Date.now();
  const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
  // Volume quotidien : croissance sur la période, plus d'activité le vendredi et le samedi
  const poidsJours = [];
  for (let j = opts.jours - 1; j >= 1; j--) {
    const jour = new Date(debutJour.getTime() - j * JOUR);
    const semaine = [0.7, 0.95, 1, 1, 1.05, 1.3, 1.25][jour.getDay()];
    poidsJours.push({ jour, poids: (0.45 + (1 - j / opts.jours)) * semaine * entre(0.75, 1.25) });
  }
  const total = poidsJours.reduce((s, x) => s + x.poids, 0);
  const plan = [];
  const fidelite = comptes.clients.slice(1).map((_, i) => 1 / (i + 1) ** 0.6); // quelques clients très fidèles
  const heure = () => pondere([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], [2, 4, 5, 6, 8, 8, 6, 5, 6, 8, 8, 6, 3]);

  for (const { jour, poids } of poidsJours) {
    const n = Math.round((poids / total) * opts.commandes);
    for (let k = 0; k < n; k++) {
      const age = (maintenant - jour.getTime()) / JOUR;
      const r = alea();
      let sort = 'CONFIRMEE';
      if (r < 0.06) sort = 'ANNULEE_CLIENT';
      else if (r < 0.095) sort = 'ANNULEE_VALIDEE';
      else if (r < 0.12) sort = 'ANNULEE_AFFECTEE';
      else if (r < 0.14 || (age < 2 && r < 0.3)) sort = 'LIVREE';
      plan.push({ date: new Date(jour.getTime() + heure() * 60 * MINUTE + entier(0, 59) * MINUTE), client: pondere(comptes.clients.slice(1), fidelite), sort });
    }
  }
  // Commandes du client de démo : un historique, puis une commande à chaque étape utile pour tester
  for (let k = 0; k < 12; k++) {
    plan.push({ date: new Date(debutJour.getTime() - entier(2, Math.min(18, opts.jours - 1)) * JOUR + heure() * 60 * MINUTE), client: comptes.demoClient, sort: k === 3 ? 'ANNULEE_CLIENT' : 'CONFIRMEE' });
  }
  // Aujourd'hui : des commandes à toutes les étapes (tableau de bord et carte vivants)
  const auj = (minutesAvant) => new Date(maintenant - minutesAvant * MINUTE);
  const autres = comptes.clients.slice(1);
  const aujourdhui = [
    ['CONFIRMEE', 6], ['LIVREE', 3], ['EN_COURS', 4], ['ACCEPTEE', 2], ['LIVREUR_AFFECTE', 2], ['VALIDEE', 3], ['NOUVELLE', 4],
  ];
  for (const [sort, n] of aujourdhui) for (let k = 0; k < n; k++) plan.push({ date: auj(entier(60, 540)), client: choisir(autres), sort, aujourdhui: true });
  plan.push({ date: auj(95), client: comptes.demoClient, sort: 'EN_COURS', aujourdhui: true });
  plan.push({ date: auj(200), client: comptes.demoClient, sort: 'LIVREE', aujourdhui: true });
  plan.push({ date: auj(25), client: comptes.demoClient, sort: 'NOUVELLE', aujourdhui: true });
  plan.push({ date: auj(70), client: choisir(autres), sort: 'LIVREUR_AFFECTE', aujourdhui: true, livreurDemo: true });

  for (const p of plan) {
    const type = pondere(TYPES, [45, 25, 22, 8]);
    const lieuClient = p.client.lieu || choisir(D.LIEUX);
    let autre;
    do { autre = pondere(D.LIEUX, D.LIEUX.map((l) => l[4])); } while (autre === lieuClient);
    const [depart, arrivee] = alea() < 0.55 ? [lieuClient, autre] : [autre, lieuClient];
    Object.assign(p, { type, poids: Math.round(entre(...POIDS[type]) * 10) / 10, depart, arrivee });
  }
  return plan.sort((a, b) => a.date - b.date);
}

// ── 5. Exécution du cycle réel puis datation ─────────────────────────
const point = (lieu, bruit = 0.0025) => ({ latitude: +(lieu[1] + entre(-bruit, bruit)).toFixed(6), longitude: +(lieu[2] + entre(-bruit, bruit)).toFixed(6) });
const avancer = (t, min, max) => new Date(t.getTime() + entre(min, max) * MINUTE);

async function executerCommande(p, comptes, zones, etat) {
  const client = p.client;
  const dep = point(p.depart); const arr = point(p.arrivee);
  const cmd = await commandes.creer(client, {
    adresseDepart: p.depart[0] + choisir(D.REPERES), latitudeDepart: dep.latitude, longitudeDepart: dep.longitude,
    adresseArrivee: p.arrivee[0] + choisir(D.REPERES), latitudeArrivee: arr.latitude, longitudeArrivee: arr.longitude,
    zoneId: zones[p.arrivee[3]], typeColis: p.type, poidsKg: p.poids,
  });
  const dates = [p.date]; // une date par ligne d'historique, dans l'ordre
  let t = p.date;
  const admin = alea() < 0.7 ? comptes.demoAdmin : comptes.admins[1];
  const agir = async (action, acteur, options, min, max) => {
    t = avancer(t, min, max);
    await commandes.executerAction(action, cmd.id, acteur, options);
    dates.push(t);
  };
  const reperes = {};

  if (p.sort === 'NOUVELLE') return { cmd, dates, reperes };
  if (p.sort === 'ANNULEE_CLIENT') {
    await agir('annuler', client, { motif: choisir(D.MOTIFS_ANNULATION_CLIENT) }, 5, 90);
    return { cmd, dates, reperes };
  }
  await agir('valider', admin, {}, 4, 40);
  if (p.sort === 'VALIDEE') return { cmd, dates, reperes };
  if (p.sort === 'ANNULEE_VALIDEE') {
    await agir('annuler', admin, { motif: choisir(D.MOTIFS_ANNULATION_ADMIN) }, 10, 120);
    return { cmd, dates, reperes };
  }

  const actif = !['CONFIRMEE', 'LIVREE'].includes(p.sort) && p.aujourdhui;
  const livreur = p.livreurDemo ? comptes.demoLivreur : choisirLivreur(comptes, etat, actif);
  if (!p.livreurDemo && alea() < 0.06) { // refus avec motif, puis réaffectation
    const premier = choisirLivreur(comptes, etat, false, livreur);
    await agir('affecter', admin, { livreurId: premier.id }, 2, 20);
    await agir('refuser', premier, { motif: choisir(D.MOTIFS_REFUS) }, 2, 15);
  }
  await agir('affecter', admin, { livreurId: livreur.id }, 2, 20);
  reperes.affectation = t;
  if (p.sort === 'LIVREUR_AFFECTE') return { cmd, dates, reperes, livreur };
  if (p.sort === 'ANNULEE_AFFECTEE') {
    await agir('annuler', admin, { motif: choisir(D.MOTIFS_ANNULATION_ADMIN) }, 5, 60);
    return { cmd, dates, reperes };
  }
  await agir('accepter', livreur, {}, 1, 12);
  if (p.sort === 'ACCEPTEE') return { cmd, dates, reperes, livreur };
  await agir('demarrer', livreur, {}, 8, 30);
  reperes.debut = t;

  // Trajet GPS : points entre départ et arrivée, avec un léger détour
  const vitesse = { MOTO: 24, SCOOTER: 20, VOITURE: 18, VELO: 13 }[livreur.vehicule];
  const duree = Math.max(6, (cmd.distanceKm / vitesse) * 60 * entre(1.1, 1.5) + entre(2, 8));
  const nbPoints = p.sort === 'EN_COURS' ? entier(3, 6) : Math.min(16, Math.max(6, Math.round(duree / 2.5)));
  const fraction = p.sort === 'EN_COURS' ? entre(0.35, 0.7) : 1;
  const detour = { latitude: entre(-0.004, 0.004), longitude: entre(-0.004, 0.004) };
  reperes.positions = [];
  for (let i = 0; i <= nbPoints; i++) {
    const f = (i / nbPoints) * fraction;
    const courbe = Math.sin(Math.PI * f);
    await suivi.enregistrerPosition(cmd.id, livreur, {
      latitude: +(dep.latitude + (arr.latitude - dep.latitude) * f + detour.latitude * courbe + entre(-0.0004, 0.0004)).toFixed(6),
      longitude: +(dep.longitude + (arr.longitude - dep.longitude) * f + detour.longitude * courbe + entre(-0.0004, 0.0004)).toFixed(6),
    });
    reperes.positions.push(new Date(reperes.debut.getTime() + (duree * f) * MINUTE));
  }
  if (p.sort === 'EN_COURS') return { cmd, dates, reperes, livreur };

  t = new Date(reperes.debut.getTime() + duree * MINUTE);
  await commandes.executerAction('terminer', cmd.id, livreur, {});
  dates.push(t);
  reperes.fin = t;
  if (p.sort === 'LIVREE') return { cmd, dates, reperes };
  const note = pondere([5, 4, 3, 2, 1], [livreur.qualite * 55, 30, 10, 3, 2]);
  await agir('confirmer', client, { note }, 5, 240);
  return { cmd, dates, reperes };
}

function choisirLivreur(comptes, etat, pourAujourdhui, exclu) {
  // Livreurs actifs sur la période (les 2 futurs suspendus ne prennent rien aujourd'hui)
  // Le livreur de démo a un historique, mais reste libre aujourd'hui (pour tester le parcours complet)
  let candidats = comptes.livreurs.filter((l) => l !== exclu);
  if (pourAujourdhui) {
    const actifs = candidats.filter((l) => l !== comptes.demoLivreur && !etat.suspendus.has(l.id));
    const libres = actifs.filter((l) => !etat.occupes.has(l.id));
    candidats = libres.length ? libres : actifs; // petit volume : un livreur peut avoir deux courses en cours
  }
  const l = pondere(candidats, candidats.map((x) => x.productivite));
  if (pourAujourdhui) etat.occupes.add(l.id);
  return l;
}

// Les dates réelles ont été posées par PostgreSQL (now() de chaque transaction) :
// on les remplace par les dates planifiées, en gardant l'appariement exact
// historique ↔ notifications (même transaction = même horodatage).
async function dater(res, demoIds) {
  const { cmd, dates, reperes } = res;
  const plafond = Date.now() - MINUTE;
  const decalage = Math.max(0, dates.at(-1).getTime() - plafond, (reperes.positions?.at(-1)?.getTime() || 0) - plafond);
  const d = (x) => new Date(x.getTime() - decalage);
  const hist = (await query('SELECT id, date_changement FROM historique_statuts WHERE commande_id = $1 ORDER BY id', [cmd.id])).rows;
  if (hist.length !== dates.length) throw new Error(`Historique incohérent pour ${cmd.numero} (${hist.length} lignes, ${dates.length} dates)`);
  const parTransaction = new Map(hist.map((h, i) => [h.date_changement.getTime(), d(dates[i])]));
  const notifs = (await query('SELECT id, utilisateur_id, date_creation FROM notifications WHERE commande_id = $1', [cmd.id])).rows;

  await transaction(async (c) => {
    await c.query('UPDATE commandes SET date_creation = $2 WHERE id = $1', [cmd.id, d(dates[0])]);
    await c.query(`UPDATE historique_statuts h SET date_changement = x.d FROM unnest($1::bigint[], $2::timestamptz[]) AS x(id, d) WHERE h.id = x.id`,
      [hist.map((h) => h.id), hist.map((_, i) => d(dates[i]))]);
    // Notifications : comptes de démo uniquement ; les plus anciennes sont marquées comme lues
    const garder = notifs.filter((n) => demoIds.has(n.utilisateur_id));
    const supprimer = notifs.filter((n) => !demoIds.has(n.utilisateur_id)).map((n) => n.id);
    if (supprimer.length) await c.query('DELETE FROM notifications WHERE id = ANY($1::uuid[])', [supprimer]);
    const nouvelles = garder.map((n) => new Date((parTransaction.get(n.date_creation.getTime()) || d(dates[0])).getTime() + entier(1, 20) * 1000));
    await c.query(`UPDATE notifications n SET date_creation = x.d, statut = x.s::statut_notification
      FROM unnest($1::uuid[], $2::timestamptz[], $3::text[]) AS x(id, d, s) WHERE n.id = x.id`,
    [garder.map((n) => n.id), nouvelles, nouvelles.map((x) => (Date.now() - x.getTime() > 2 * JOUR || alea() < 0.3 ? 'LUE' : 'NON_LUE'))]);
    if (reperes.affectation) {
      await c.query(`UPDATE livraisons SET date_affectation = $2, date_debut = $3, date_fin = $4 WHERE commande_id = $1`,
        [cmd.id, d(reperes.affectation), reperes.debut ? d(reperes.debut) : null, reperes.fin ? d(reperes.fin) : null]);
    }
    if (reperes.positions) {
      const ids = (await c.query('SELECT p.id FROM positions_gps p JOIN livraisons l ON l.id = p.livraison_id WHERE l.commande_id = $1 ORDER BY p.id', [cmd.id])).rows.map((r) => r.id);
      await c.query('UPDATE positions_gps p SET date_heure = x.d FROM unnest($1::bigint[], $2::timestamptz[]) AS x(id, d) WHERE p.id = x.id',
        [ids, ids.map((_, i) => d(reperes.positions[i]))]);
    }
  });
  return d(dates[0]);
}

// ── 6. Finitions : dates d'inscription, disponibilités, assistant, rapports ─
async function finaliser(comptes, premieresCommandes, journal) {
  // Inscription toujours antérieure à la première commande du client
  for (const cl of comptes.clients) {
    const premiere = premieresCommandes.get(cl.id);
    if (premiere) await query('UPDATE utilisateurs SET date_creation = $2 WHERE id = $1', [cl.id, new Date(premiere.getTime() - entier(1, 25) * JOUR - entier(0, 600) * MINUTE)]);
  }
  // Livreurs : position récente autour de leur quartier ; environ 60 % disponibles ; 2 suspendus
  const actifsLivreurs = comptes.livreurs.filter((l) => !comptes.suspendus.includes(l));
  for (const l of actifsLivreurs) {
    const pos = point(l.lieu, 0.004);
    const disponible = l === comptes.demoLivreur || alea() < 0.6;
    await query('UPDATE livreurs SET disponibilite = $2, latitude_actuelle = $3, longitude_actuelle = $4, date_position = $5 WHERE id = $1',
      [l.id, disponible, pos.latitude, pos.longitude, new Date(Date.now() - entier(1, 25) * MINUTE)]);
  }
  for (const l of comptes.suspendus) {
    await query("UPDATE utilisateurs SET statut_compte = 'INACTIF' WHERE id = $1", [l.id]);
    await query('UPDATE livreurs SET disponibilite = false WHERE id = $1', [l.id]);
  }

  // Conversations avec l'assistant : réponses calculées à partir de la base (mode secours, sans IA)
  let conversations = 0;
  const avecQuestions = [comptes.demoClient, ...comptes.clients.slice(1, 15)];
  for (const cl of avecQuestions) {
    const { rows } = await query("SELECT id, numero, date_creation FROM commandes WHERE client_id = $1 AND statut IN ('CONFIRMEE', 'LIVREE') ORDER BY date_creation DESC LIMIT 3", [cl.id]);
    for (let k = 0; k < entier(1, 3); k++) {
      const modele = choisir(D.QUESTIONS_ASSISTANT);
      const cmd = rows.length ? choisir(rows) : null;
      if (modele.length === 1 && !cmd) continue;
      const question = modele(cmd?.numero);
      const contexte = { client: cl, traces: [], question };
      const reponse = await repondreEnSecours(question, contexte);
      const consultee = contexte.traces.find((t) => t.nom === 'consulter_commande' && t.resultat?.trouve);
      const base = cmd ? cmd.date_creation.getTime() + entre(3, 30) * 60 * MINUTE : Date.now() - entre(1, 25) * JOUR;
      await query(`INSERT INTO conversations_ia (client_id, commande_id, question, reponse, fournisseur, modele, date_heure)
        VALUES ($1, $2, $3, $4, 'secours', NULL, $5)`, [cl.id, consultee?.resultat.commande_id || null, question, reponse, new Date(Math.min(base, Date.now() - 5 * MINUTE))]);
      conversations += 1;
    }
  }
  journal(`  • ${conversations} échanges avec l'assistant`);

  // Rapports PDF du mois précédent (KPI figés dans la table kpis)
  const auj = new Date();
  const fin = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), 0));
  const debut = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), 1));
  const iso = (x) => x.toISOString().slice(0, 10);
  for (const type of ['ACTIVITE_GLOBALE', 'PERFORMANCE_LIVREURS', 'FINANCIER']) {
    await rapports.generer({ type, periodeDebut: iso(debut), periodeFin: iso(fin) }, comptes.demoAdmin);
  }
  journal(`  • 3 rapports PDF (${iso(debut)} au ${iso(fin)})`);
}

// ── Programme principal ──────────────────────────────────────────────
async function executerSeed(options = {}, journal = console.log) {
  const fournies = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)); // options absentes : valeurs par défaut
  const opts = { commandes: 600, jours: 90, clients: 60, livreurs: 16, remplacer: false, ...fournies };
  alea = generateur(2026); // même jeu de données à chaque exécution
  if (process.env.NODE_ENV === 'production' && !opts.autoriserProduction) {
    throw new Error('Seed refusé en production (NODE_ENV=production). Option --autoriser-production pour forcer.');
  }

  journal('Analyse du schéma PostgreSQL…');
  const { zones, tables, enums, triggers } = await analyserSchema();
  journal(`  • ${tables} tables, ${enums} types énumérés, ${triggers} triggers métier vérifiés ; ${Object.keys(zones).length} zones`);

  const existants = await compterDemo();
  if (existants && !opts.remplacer) {
    throw new Error(`${existants} comptes de démonstration existent déjà. Rien n'a été modifié.\n`
      + 'Pour les supprimer et les recréer : npm run db:seed -- --remplacer');
  }
  if (existants) await supprimerDemo(journal);

  const mdp = motDePasseDemo();
  const debutPeriode = new Date(Date.now() - opts.jours * JOUR);
  journal('Création des comptes…');
  const comptes = await creerComptes({ ...opts, motDePasse: mdp.valeur }, debutPeriode);
  comptes.livreurs.forEach((l) => { l.productivite = entre(0.5, 2); l.qualite = entre(0.7, 1.4); l.lieu = l.lieu || choisir(D.LIEUX); });
  comptes.suspendus = comptes.livreurs.slice(-2);
  journal(`  • ${comptes.admins.length} administrateurs, ${comptes.clients.length} clients, ${comptes.livreurs.length + comptes.enAttente.length} livreurs`);

  // Le livreur de démo reçoit un historique conséquent
  comptes.demoLivreur.productivite = 3;
  const plan = planifier(opts, comptes);
  journal(`Cycle de ${plan.length} commandes via les services du backend (peut prendre quelques minutes)…`);
  const demoIds = new Set([...comptes.admins, ...comptes.clients, ...comptes.livreurs, ...comptes.enAttente].map((u) => u.id));
  const etat = { occupes: new Set(), suspendus: new Set(comptes.suspendus.map((l) => l.id)) };
  const premieres = new Map();
  for (let i = 0; i < plan.length; i++) {
    const res = await executerCommande(plan[i], comptes, zones, etat);
    const date = await dater(res, demoIds);
    if (!premieres.has(plan[i].client.id) || date < premieres.get(plan[i].client.id)) premieres.set(plan[i].client.id, date);
    if ((i + 1) % 50 === 0 || i === plan.length - 1) journal(`  • ${i + 1}/${plan.length} commandes`);
  }

  journal('Finitions…');
  await finaliser(comptes, premieres, journal);
  return { comptes, motDePasse: mdp };
}

async function bilan(journal = console.log) {
  journal('\nEnregistrements par table (total en base / dont démonstration) :');
  const demo = 'SELECT id FROM utilisateurs WHERE email LIKE $1';
  const requetes = {
    utilisateurs: [`SELECT count(*) FROM utilisateurs`, `SELECT count(*) FROM utilisateurs WHERE email LIKE $1`],
    clients: ['SELECT count(*) FROM clients', `SELECT count(*) FROM clients WHERE id IN (${demo})`],
    livreurs: ['SELECT count(*) FROM livreurs', `SELECT count(*) FROM livreurs WHERE id IN (${demo})`],
    administrateurs: ['SELECT count(*) FROM administrateurs', `SELECT count(*) FROM administrateurs WHERE id IN (${demo})`],
    zones: ['SELECT count(*) FROM zones', null],
    parametres_tarification: ['SELECT count(*) FROM parametres_tarification', null],
    commandes: ['SELECT count(*) FROM commandes', `SELECT count(*) FROM commandes WHERE client_id IN (${demo})`],
    livraisons: ['SELECT count(*) FROM livraisons', `SELECT count(*) FROM livraisons l JOIN commandes c ON c.id = l.commande_id WHERE c.client_id IN (${demo})`],
    positions_gps: ['SELECT count(*) FROM positions_gps', `SELECT count(*) FROM positions_gps p JOIN livraisons l ON l.id = p.livraison_id JOIN commandes c ON c.id = l.commande_id WHERE c.client_id IN (${demo})`],
    historique_statuts: ['SELECT count(*) FROM historique_statuts', `SELECT count(*) FROM historique_statuts h JOIN commandes c ON c.id = h.commande_id WHERE c.client_id IN (${demo})`],
    notifications: ['SELECT count(*) FROM notifications', `SELECT count(*) FROM notifications WHERE utilisateur_id IN (${demo})`],
    conversations_ia: ['SELECT count(*) FROM conversations_ia', `SELECT count(*) FROM conversations_ia WHERE client_id IN (${demo})`],
    rapports: ['SELECT count(*) FROM rapports', `SELECT count(*) FROM rapports WHERE administrateur_id IN (${demo})`],
    kpis: ['SELECT count(*) FROM kpis', `SELECT count(*) FROM kpis k JOIN rapports r ON r.id = k.rapport_id WHERE r.administrateur_id IN (${demo})`],
    reinitialisations_mot_de_passe: ['SELECT count(*) FROM reinitialisations_mot_de_passe', null],
  };
  const resultat = {};
  for (const [table, [tous, demos]] of Object.entries(requetes)) {
    const total = Number((await query(tous)).rows[0].count);
    const dont = demos ? Number((await query(demos, [MOTIF_EMAIL])).rows[0].count) : null;
    resultat[table] = { total, demo: dont };
    journal(`  ${table.padEnd(32)} ${String(total).padStart(6)}   ${dont === null ? '(référence)' : `dont ${dont}`}`);
  }
  const statuts = (await query(`SELECT statut, count(*) AS n FROM commandes WHERE client_id IN (${demo}) GROUP BY statut ORDER BY n DESC`, [MOTIF_EMAIL])).rows;
  journal(`\nCommandes de démo par statut : ${statuts.map((s) => `${s.statut} ${s.n}`).join(' · ')}`);
  return resultat;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const valeur = (nom) => Number(args.find((a) => a.startsWith(`--${nom}=`))?.split('=')[1]) || undefined;
  (async () => {
    try {
      if (args.includes('--supprimer')) {
        await analyserSchema();
        if (await compterDemo()) await supprimerDemo(); else console.log('Aucune donnée de démonstration à supprimer.');
        return;
      }
      const debut = Date.now();
      const { comptes, motDePasse } = await executerSeed({
        remplacer: args.includes('--remplacer'), autoriserProduction: args.includes('--autoriser-production'),
        commandes: valeur('commandes'), jours: valeur('jours'),
      });
      await bilan();
      const i = (await kpi.tableauDeBord('30j')).indicateurs;
      console.log(`\nKPI (30 derniers jours) : ${i.totalCommandes} commandes, ${i.livrees} livraisons, taux de réussite ${i.tauxReussite} %, `
        + `CA ${i.chiffreAffaires} FCFA, temps moyen ${i.tempsLivraisonMinutes} min, note ${i.noteMoyenne}/5`);
      console.log('\n┌──────────────────────────── COMPTES DE DÉMONSTRATION ────────────────────────────┐');
      for (const [role, c] of [['Administrateur', comptes.demoAdmin], ['Client', comptes.demoClient], ['Livreur', comptes.demoLivreur]]) {
        console.log(`│ ${role.padEnd(15)} ${c.email.padEnd(64)}│`);
      }
      console.log(motDePasse.genere
        ? `│ Mot de passe (affiché UNE SEULE FOIS, notez-le) : ${motDePasse.valeur.padEnd(31)}│`
        : '│ Mot de passe : celui de DEMO_MOT_DE_PASSE dans backend/.env                         │');
      console.log('└──────────────────────────────────────────────────────────────────────────────────┘');
      console.log(`Terminé en ${Math.round((Date.now() - debut) / 1000)} s.`);
    } catch (err) {
      console.error(`\n✘ ${err.message}`);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  })();
}

module.exports = { executerSeed, supprimerDemo, compterDemo, analyserSchema, bilan, DOMAINE_DEMO: D.DOMAINE_DEMO };
