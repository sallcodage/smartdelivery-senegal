// ─────────────────────────────────────────────────────────────────────
//  Audit automatique de TOUS les écrans des 3 espaces :
//   • responsive : aucun débordement horizontal en 375 px (téléphone), 768 px (tablette), 1280 px (ordinateur)
//   • accessibilité (axe-core, règles WCAG 2.1 A et AA) : violations graves et critiques
//  Lancement : E2E_ADMIN_EMAIL=… E2E_ADMIN_MOT_DE_PASSE=… npm run responsive
// ─────────────────────────────────────────────────────────────────────
import { createRequire } from 'module';
import { URL_APP, identifiant, telephone, lancerNavigateur, journal, session, connecter, api } from './outils.mjs';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const LARGEURS = [375, 768, 1280];
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, motDePasse: process.env.E2E_ADMIN_MOT_DE_PASSE };
if (!ADMIN.email) { console.error('Indiquez E2E_ADMIN_EMAIL et E2E_ADMIN_MOT_DE_PASSE.'); process.exit(1); }

// Données réelles nécessaires aux pages de détail
const jA = (await api('/auth/connexion', { methode: 'POST', corps: ADMIN })).jeton;
const client = { email: `audit.c.${identifiant}@exemple.sn`, motDePasse: 'Audit-2026x' };
await api('/auth/inscription/client', { methode: 'POST', corps: { prenom: 'Audit', nom: 'Client', email: client.email, telephone: telephone(), motDePasse: client.motDePasse, confirmationMotDePasse: client.motDePasse, adresse: 'Plateau, Dakar' } });
const livreur = { email: `audit.l.${identifiant}@exemple.sn`, motDePasse: 'Audit-2026x' };
const idLivreur = (await api('/admin/utilisateurs', { methode: 'POST', jeton: jA, corps: { role: 'LIVREUR', prenom: 'Audit', nom: 'Livreur', email: livreur.email, telephone: telephone(), motDePasse: livreur.motDePasse, vehicule: 'MOTO' } })).utilisateur.id;
const jC = (await api('/auth/connexion', { methode: 'POST', corps: client })).jeton;
const jL = (await api('/auth/connexion', { methode: 'POST', corps: livreur })).jeton;
await api('/livreurs/moi/disponibilite', { methode: 'PATCH', jeton: jL, corps: { disponibilite: true } });
const c = (await api('/commandes', { methode: 'POST', jeton: jC, corps: { adresseDepart: 'Marché Sandaga, Plateau', latitudeDepart: 14.67, longitudeDepart: -17.439, adresseArrivee: 'Pointe des Almadies', latitudeArrivee: 14.7453, longitudeArrivee: -17.5134, zoneId: 1, typeColis: 'PRODUITS', poidsKg: 3 } })).commande;
await api(`/commandes/${c.id}/valider`, { methode: 'POST', jeton: jA });
await api(`/commandes/${c.id}/affecter`, { methode: 'POST', jeton: jA, corps: { livreurId: idLivreur } });
await api(`/commandes/${c.id}/accepter`, { methode: 'POST', jeton: jL });
await api(`/commandes/${c.id}/demarrer`, { methode: 'POST', jeton: jL });
await api(`/commandes/${c.id}/positions`, { methode: 'POST', jeton: jL, corps: { latitude: 14.70, longitude: -17.47 } });
const idClient = (await api(`/admin/utilisateurs?recherche=${encodeURIComponent(client.email)}`, { jeton: jA })).donnees[0].id;

const PAGES = {
  public: ['/connexion', '/inscription', '/inscription?profil=livreur', '/mot-de-passe-oublie', '/conditions'],
  client: ['/client', '/client/commandes/nouvelle', '/client/commandes', `/client/commandes/${c.id}`, `/client/commandes/${c.id}/suivi`, '/client/assistant', '/client/notifications', '/client/profil'],
  livreur: ['/livreur', '/livreur/livraisons', `/livreur/livraisons/${c.id}`, `/livreur/livraisons/${c.id}/en-cours`, '/livreur/historique', '/livreur/performances', '/livreur/notifications', '/livreur/profil'],
  admin: ['/admin', '/admin/commandes', `/admin/commandes/${c.id}`, '/admin/livraisons', '/admin/utilisateurs', '/admin/livreurs', `/admin/livreurs/${idLivreur}`, '/admin/clients', `/admin/clients/${idClient}`, '/admin/statistiques', '/admin/rapports', '/admin/parametres', '/admin/notifications', '/admin/profil'],
};
const COMPTES = { client, livreur, admin: ADMIN };

const j = journal();
const navigateur = await lancerNavigateur();
const debordements = [];
const violations = new Map(); // règle → { impact, aide, pages }
let ecrans = 0;

try {
  for (const [espace, chemins] of Object.entries(PAGES)) {
    j.titre(`Espace ${espace} (${chemins.length} écrans × ${LARGEURS.length} largeurs)`);
    const p = await session(navigateur, j, { largeur: 1280, gps: espace === 'livreur' ? { latitude: 14.70, longitude: -17.47 } : null });
    if (COMPTES[espace]) await connecter(p, COMPTES[espace].email, COMPTES[espace].motDePasse);
    for (const chemin of chemins) {
      for (const largeur of LARGEURS) {
        await p.setViewport({ width: largeur, height: 860 });
        await p.goto(`${URL_APP}${chemin}`, { waitUntil: 'networkidle2' });
        await p.waitForFunction(() => !document.querySelector('[role=status]')?.textContent.includes('Chargement'), { timeout: 15000 }).catch(() => {});
        const d = await p.evaluate(() => {
          const largeurPage = document.documentElement.scrollWidth;
          if (largeurPage <= window.innerWidth + 1) return null;
          const fautif = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
            .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width).slice(-1)[0];
          return { largeurPage, element: fautif ? `${fautif.tagName.toLowerCase()}.${String(fautif.className).split(' ').slice(0, 3).join('.')}` : '?' };
        });
        ecrans += 1;
        if (d) debordements.push(`${chemin} @ ${largeur}px : page de ${d.largeurPage}px (${d.element})`);
        if (largeur === 375 || largeur === 1280) {
          await p.addScriptTag({ path: AXE });
          const resultat = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], resultTypes: ['violations'] }));
          for (const v of resultat.violations.filter((x) => ['serious', 'critical'].includes(x.impact))) {
            const entree = violations.get(v.id) || { impact: v.impact, aide: v.help, pages: new Set(), exemple: v.nodes[0]?.target.join(' '), extraits: new Set() };
            v.nodes.slice(0, 2).forEach((n) => entree.extraits.add(`${chemin}@${largeur} : ${n.html.slice(0, 110)}`));
            entree.pages.add(`${chemin}@${largeur}`);
            violations.set(v.id, entree);
          }
        }
      }
      j.ok(chemin);
    }
  }
  console.log(`\n${ecrans} affichages contrôlés.`);
  console.log(`\nDébordements horizontaux : ${debordements.length}`);
  debordements.forEach((d) => console.log(`  - ${d}`));
  console.log(`\nAccessibilité (violations graves/critiques WCAG 2.1 AA) : ${violations.size} règle(s)`);
  for (const [id, v] of violations) {
    console.log(`  - [${v.impact}] ${id} : ${v.aide} (${v.pages.size} écran(s))`);
    [...v.extraits].slice(0, 8).forEach((x) => console.log(`      ${x}`));
  }
  process.exitCode = debordements.length || violations.size ? 1 : 0;
} catch (err) {
  console.error(`\n✘ ${err.message}`);
  process.exitCode = 1;
} finally {
  await navigateur.close();
}
