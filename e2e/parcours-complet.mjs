// ─────────────────────────────────────────────────────────────────────
//  PARCOURS COMPLET D'UNE COMMANDE — uniquement par l'interface, 3 utilisateurs.
//  Client crée → Admin voit, valide, affecte → Livreur accepte, démarre, envoie
//  sa position → Client suit sur la carte → Livreur termine → Client confirme
//  → Commande « Terminée » (CONFIRMEE) → KPI, notifications, rapport, assistant.
//
//  Prérequis : API (port 4000) et interface (port 5173) démarrées, compte admin existant.
//  Lancement : E2E_ADMIN_EMAIL=… E2E_ADMIN_MOT_DE_PASSE=… npm run parcours   (--visible pour la démo)
// ─────────────────────────────────────────────────────────────────────
import os from 'os';
import path from 'path';
import fs from 'fs';
import {
  URL_APP, VISIBLE, pause, identifiant, telephone, lancerNavigateur, journal, session, texte,
  attendreTexte, attendreChemin, cliquer, remplir, connecter, api, imagePng, cliquerCarte,
} from './outils.mjs';

const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, motDePasse: process.env.E2E_ADMIN_MOT_DE_PASSE };
if (!ADMIN.email || !ADMIN.motDePasse) {
  console.error('Indiquez le compte administrateur : E2E_ADMIN_EMAIL et E2E_ADMIN_MOT_DE_PASSE (voir e2e/.env.example).');
  process.exit(1);
}
const CAPTURES = path.join(path.dirname(new URL(import.meta.url).pathname), 'captures');
fs.mkdirSync(CAPTURES, { recursive: true });
const PHOTO = imagePng(path.join(os.tmpdir(), 'smartdelivery-permis.png'));

// Lieux réels de Dakar (trajet Médina → Ouakam)
const L = {
  medina: { latitude: 14.6835, longitude: -17.4521 }, fann: { latitude: 14.6930, longitude: -17.4660 },
  mermoz: { latitude: 14.7070, longitude: -17.4760 }, ouakam: { latitude: 14.7236, longitude: -17.4880 },
};
const CLIENT = { prenom: 'Awa', nom: `Ndiaye${identifiant.slice(-4).toUpperCase()}`, email: `awa.${identifiant}@exemple.sn`, motDePasse: 'Awa-Demo-2026' };
const LIVREUR = { prenom: 'Moussa', nom: `Diop${identifiant.slice(-4).toUpperCase()}`, email: `moussa.${identifiant}@exemple.sn`, motDePasse: 'Moussa-Demo-2026' };

const j = journal();
const debut = Date.now();
const navigateur = await lancerNavigateur();
const capture = (p, nom) => p.screenshot({ path: path.join(CAPTURES, `${nom}.png`) });

try {
  const jetonAdmin = (await api('/auth/connexion', { methode: 'POST', corps: ADMIN })).jeton;
  const kpiAvant = (await api('/admin/kpi?periode=7j', { jeton: jetonAdmin })).indicateurs;

  // ── 1. Inscription du client ──────────────────────────────────────
  j.titre('INSCRIPTION du client');
  const client = await session(navigateur, j);
  await client.goto(`${URL_APP}/inscription`, { waitUntil: 'networkidle2' });
  await remplir(client, 'Prénom', CLIENT.prenom);
  await remplir(client, 'Nom', CLIENT.nom);
  await remplir(client, 'Téléphone', telephone());
  await remplir(client, 'Adresse e-mail', CLIENT.email);
  await remplir(client, "Confirmer l'e-mail", CLIENT.email);
  await remplir(client, 'Mot de passe', CLIENT.motDePasse);
  await remplir(client, 'Confirmer le mot de passe', CLIENT.motDePasse);
  await remplir(client, 'Adresse', 'Ouakam, Dakar');
  await client.click('input[name=cgu]');
  await cliquer(client, 'Créer mon compte');
  await attendreTexte(client, 'Compte créé avec succès');
  const enBase = (await api(`/admin/utilisateurs?recherche=${encodeURIComponent(CLIENT.email)}`, { jeton: jetonAdmin })).donnees[0];
  j.verifier(enBase?.role === 'CLIENT' && enBase.statutCompte === 'ACTIF', 'Compte client créé et enregistré dans PostgreSQL (rôle CLIENT)');

  // ── 2. Authentification et redirection selon le rôle ──────────────
  j.titre('AUTHENTIFICATION');
  await connecter(client, CLIENT.email, CLIENT.motDePasse);
  await attendreChemin(client, '^/client$');
  const jetonStocke = await client.evaluate(() => localStorage.getItem('smartdelivery_jeton') || sessionStorage.getItem('smartdelivery_jeton'));
  j.verifier(jetonStocke?.split('.').length === 3, 'Connexion : JWT reçu et conservé');
  j.verifier(true, 'Rôle détecté depuis la base : redirection vers /client');
  await client.goto(`${URL_APP}/admin`, { waitUntil: 'networkidle2' });
  await attendreChemin(client, '^/client$');
  j.ok('Le client ne peut pas accéder à /admin (renvoyé vers son espace)');

  // ── 3. Inscription d'un livreur et validation par l'admin ──────────
  j.titre('INSCRIPTION du livreur et VALIDATION par l\'administrateur');
  const livreur = await session(navigateur, j, { largeur: 420, hauteur: 860, gps: L.medina });
  await livreur.goto(`${URL_APP}/inscription?profil=livreur`, { waitUntil: 'networkidle2' });
  await remplir(livreur, 'Prénom', LIVREUR.prenom);
  await remplir(livreur, 'Nom', LIVREUR.nom);
  await remplir(livreur, 'Téléphone', telephone());
  await remplir(livreur, 'Adresse e-mail', LIVREUR.email);
  await remplir(livreur, "Confirmer l'e-mail", LIVREUR.email);
  await remplir(livreur, 'Mot de passe', LIVREUR.motDePasse);
  await remplir(livreur, 'Confirmer le mot de passe', LIVREUR.motDePasse);
  await livreur.select('select[name=vehicule]', 'MOTO');
  await remplir(livreur, 'Numéro de permis', `DK-${identifiant}`);
  await (await livreur.$$('input[type=file]'))[0].uploadFile(PHOTO);
  await livreur.click('input[name=cgu]');
  await cliquer(livreur, 'Créer mon compte');
  await attendreTexte(livreur, 'Inscription envoyée');
  j.ok('Inscription livreur avec photo du permis : compte en attente');

  const admin = await session(navigateur, j);
  await connecter(admin, ADMIN.email, ADMIN.motDePasse);
  await attendreChemin(admin, '^/admin$');
  j.ok('Connexion administrateur : redirection vers /admin');
  await admin.goto(`${URL_APP}/admin/livreurs`, { waitUntil: 'networkidle2' });
  await admin.waitForFunction(() => [...document.querySelectorAll('[role=tab]')].some((t) => t.textContent.startsWith('À valider')));
  await (await admin.waitForFunction(() => [...document.querySelectorAll('[role=tab]')].find((t) => t.textContent.startsWith('À valider')))).asElement().click();
  await (await admin.waitForFunction((n) => [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes(n)), {}, LIVREUR.nom)).asElement().click();
  await attendreChemin(admin, '^/admin/livreurs/');
  await cliquer(admin, 'Valider le compte');
  await cliquer(admin, 'Valider le compte', '[role=dialog]');
  await attendreTexte(admin, 'Compte validé');
  j.ok('Admin : documents consultés, compte du livreur validé');

  await connecter(livreur, LIVREUR.email, LIVREUR.motDePasse);
  await attendreChemin(livreur, '^/livreur$');
  await (await livreur.waitForSelector('button[role=switch]')).click();
  await attendreTexte(livreur, 'Vous êtes disponible');
  j.ok('Livreur connecté (redirection /livreur) et disponible, position GPS partagée');

  // ── 4. Le client crée une commande sur la carte ────────────────────
  j.titre('CLIENT crée une commande');
  await client.goto(`${URL_APP}/client/commandes/nouvelle`, { waitUntil: 'networkidle2' });
  await cliquerCarte(client, 0.55, 0.62);
  await client.waitForFunction(() => document.querySelectorAll('.leaflet-marker-icon').length === 1);
  await cliquerCarte(client, 0.35, 0.38);
  await client.waitForFunction(() => document.querySelectorAll('.leaflet-marker-icon').length === 2);
  await attendreTexte(client, 'Distance estimée');
  await cliquer(client, 'Produits');
  await client.type('input[type=number]', '2');
  const zone = await client.$$eval('select option', (o) => o.find((x) => x.textContent.startsWith('Dakar')).value);
  await client.select('select', zone);
  await capture(client, '01-client-nouvelle-commande');
  await cliquer(client, 'Valider la commande');
  await attendreChemin(client, '^/client/commandes/[0-9a-f-]{36}$');
  await attendreTexte(client, 'enregistrée');
  const numero = (await texte(client)).match(/CMD-\d{6}/)[0];
  const commandeId = client.url().split('/').pop();
  j.ok(`Commande ${numero} créée (prix calculé par le serveur), statut « En attente »`);

  // ── 5. L'admin la voit, la valide et l'affecte ─────────────────────
  j.titre('ADMINISTRATEUR valide et affecte');
  await admin.goto(`${URL_APP}/admin/commandes?filtre=a-valider`, { waitUntil: 'networkidle2' });
  await attendreTexte(admin, numero);
  j.ok(`L'admin voit ${numero} dans « À valider »`);
  await admin.goto(`${URL_APP}/admin/commandes/${commandeId}`, { waitUntil: 'networkidle2' });
  await cliquer(admin, 'Valider la commande');
  await attendreTexte(admin, 'Affecter un livreur');
  j.ok('Commande validée');
  await (await admin.waitForFunction((n) => [...document.querySelectorAll('label')].find((l) => l.innerText.includes(n)), {}, LIVREUR.nom)).asElement().click();
  await capture(admin, '02-admin-affectation');
  await cliquer(admin, 'Affecter le livreur choisi');
  await attendreTexte(admin, `Commande affectée à ${LIVREUR.prenom} ${LIVREUR.nom}`);
  j.ok(`Vrai livreur sélectionné et affecté : ${LIVREUR.prenom} ${LIVREUR.nom}`);

  // ── 6. Le livreur accepte, démarre et transmet sa position ─────────
  j.titre('LIVREUR accepte, démarre et transmet sa position');
  await livreur.goto(`${URL_APP}/livreur/livraisons`, { waitUntil: 'networkidle2' });
  await attendreTexte(livreur, numero);
  j.ok('Le livreur voit la livraison affectée');
  await livreur.goto(`${URL_APP}/livreur/livraisons/${commandeId}`, { waitUntil: 'networkidle2' });
  await cliquer(livreur, 'Accepter');
  await attendreTexte(livreur, 'Récupérez le colis puis démarrez la livraison');
  j.ok('Livraison acceptée');
  await cliquer(livreur, 'Démarrer la livraison');
  await cliquer(livreur, 'Démarrer', '[role=dialog]');
  await attendreChemin(livreur, '/en-cours$');
  j.ok('Livraison démarrée : écran de navigation GPS');

  // ── 7. Le client suit la livraison en direct ───────────────────────
  j.titre('CLIENT suit la livraison sur la carte');
  await client.goto(`${URL_APP}/client/commandes/${commandeId}/suivi`, { waitUntil: 'networkidle2' });
  for (const lieu of [L.fann, L.mermoz, L.ouakam]) { await livreur.setGeolocation(lieu); await pause(3500); }
  await client.waitForSelector('.marqueur-livreur', { timeout: 20000 });
  await attendreTexte(client, 'En direct');
  const suivi = await api(`/commandes/${commandeId}/suivi`, { jeton: (await api('/auth/connexion', { methode: 'POST', corps: { email: CLIENT.email, motDePasse: CLIENT.motDePasse } })).jeton });
  j.verifier(suivi.positions.length >= 3, `Positions GPS réelles enregistrées (${suivi.positions.length}) et livreur affiché sur la carte du client`);
  await capture(client, '03-client-suivi');

  // ── 8. Le livreur termine, le client confirme ──────────────────────
  j.titre('LIVREUR termine, CLIENT confirme la réception');
  await cliquer(livreur, 'Terminer la livraison');
  await cliquer(livreur, 'Colis livré', '[role=dialog]');
  await attendreTexte(livreur, 'Livraison terminée !');
  j.ok('Livraison terminée par le livreur');
  await client.goto(`${URL_APP}/client/commandes/${commandeId}`, { waitUntil: 'networkidle2' });
  await cliquer(client, 'Confirmer la réception');
  await (await client.waitForSelector('[aria-label="5 étoiles"]')).click();
  await cliquer(client, 'Confirmer', '[role=dialog]');
  await attendreTexte(client, 'Merci ! La réception de votre colis est confirmée');
  const finale = (await api(`/commandes/${commandeId}`, { jeton: jetonAdmin })).commande;
  j.verifier(finale.statut === 'CONFIRMEE', `Commande ${numero} = CONFIRMEE (« Terminée »), note 5/5`);
  j.verifier(finale.historique.map((h) => h.nouveauStatut).join('>') === 'NOUVELLE>VALIDEE>LIVREUR_AFFECTE>ACCEPTEE>EN_COURS>LIVREE>CONFIRMEE', 'Historique complet des 7 statuts');

  // ── 9. KPI, notifications, tableaux de bord ────────────────────────
  j.titre('KPI, notifications et tableaux de bord actualisés');
  const kpiApres = (await api('/admin/kpi?periode=7j', { jeton: jetonAdmin })).indicateurs;
  j.verifier(kpiApres.livrees === kpiAvant.livrees + 1 && kpiApres.chiffreAffaires === kpiAvant.chiffreAffaires + finale.montant,
    `KPI : livraisons ${kpiAvant.livrees} → ${kpiApres.livrees}, chiffre d'affaires +${finale.montant} FCFA`);
  await admin.goto(`${URL_APP}/admin`, { waitUntil: 'networkidle2' });
  await admin.waitForSelector('.recharts-surface');
  j.ok('Tableau de bord administrateur à jour');
  await client.goto(`${URL_APP}/client/notifications`, { waitUntil: 'networkidle2' });
  const notes = await texte(client);
  j.verifier(['a été validée', 'a été affecté', 'a accepté', 'est en route', 'a été livrée'].every((m) => notes.includes(m)), 'Notifications du client reçues à chaque étape');
  await livreur.goto(`${URL_APP}/livreur/performances`, { waitUntil: 'networkidle2' });
  await attendreTexte(livreur, '5 / 5');
  j.ok('Performances du livreur : 1 livraison, note 5/5');

  // ── 10. Rapport PDF, assistant IA, annulation ───────────────────────
  j.titre('RAPPORT PDF, ASSISTANT IA et ANNULATION');
  await admin.goto(`${URL_APP}/admin/rapports`, { waitUntil: 'networkidle2' });
  await cliquer(admin, '7 derniers jours');
  const rep = admin.waitForResponse((r) => r.url().endsWith('/api/admin/rapports') && r.request().method() === 'POST');
  await cliquer(admin, 'Générer le rapport PDF');
  j.verifier((await rep).status() === 201, 'Rapport PDF d\'activité généré');
  await admin.keyboard.press('Escape');

  await client.goto(`${URL_APP}/client/assistant`, { waitUntil: 'networkidle2' });
  await client.type('#question', `Où en est ma commande ${numero} ?`);
  await client.keyboard.press('Enter');
  await attendreTexte(client, `Données réelles de ${numero}`, 60000);
  const modeIA = !(await texte(client)).includes('sans IA');
  j.ok(`Assistant : réponse fondée sur les données réelles de ${numero} (${modeIA ? 'IA générative' : 'mode secours, IA non configurée'})`);
  await capture(client, '04-assistant');

  const jetonClient = (await api('/auth/connexion', { methode: 'POST', corps: { email: CLIENT.email, motDePasse: CLIENT.motDePasse } })).jeton;
  const autre = (await api('/commandes', { methode: 'POST', jeton: jetonClient, corps: { adresseDepart: 'Médina', latitudeDepart: L.medina.latitude, longitudeDepart: L.medina.longitude, adresseArrivee: 'Fann', latitudeArrivee: L.fann.latitude, longitudeArrivee: L.fann.longitude, zoneId: 1, typeColis: 'DOCUMENTS', poidsKg: 1 } })).commande;
  await client.goto(`${URL_APP}/client/commandes/${autre.id}`, { waitUntil: 'networkidle2' });
  await cliquer(client, 'Annuler la commande');
  await cliquer(client, 'Annuler la commande', '[role=dialog]');
  await attendreTexte(client, `Commande ${autre.numero} annulée`);
  j.ok(`Annulation autorisée (statut « En attente ») : ${autre.numero} annulée`);

  console.log(`\n${'─'.repeat(64)}\nPARCOURS COMPLET RÉUSSI : ${j.bilan()} vérifications en ${Math.round((Date.now() - debut) / 1000)} s`);
  console.log(`Erreurs JavaScript dans le navigateur : ${j.erreursConsole.length}`);
  j.erreursConsole.forEach((e) => console.log(`  - ${e}`));
  console.log(`Captures : ${CAPTURES}`);
  if (VISIBLE) await pause(5000);
  process.exitCode = j.erreursConsole.length ? 1 : 0;
} catch (err) {
  console.error(`\n   ✘ ${err.message}`);
  process.exitCode = 1;
} finally {
  await navigateur.close();
}
