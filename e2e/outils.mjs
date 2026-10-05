// Outils communs aux tests de bout en bout (navigateur piloté par Puppeteer).
import fs from 'fs';

// Lecture de e2e/.env s'il existe (sans dépendance, compatible avec toutes les versions de Node)
const fichierEnv = new URL('./.env', import.meta.url);
if (fs.existsSync(fichierEnv)) {
  for (const ligne of fs.readFileSync(fichierEnv, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(ligne);
    if (m && !ligne.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const URL_APP = process.env.E2E_URL || 'http://localhost:5173';
export const URL_API = process.env.E2E_API || 'http://localhost:4000/api';
export const VISIBLE = process.argv.includes('--visible') || process.env.E2E_VISIBLE === '1';
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export const identifiant = Date.now().toString(36);
export const telephone = () => `7${Math.floor(Math.random() * 9)}${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;

export async function lancerNavigateur() {
  const options = {
    headless: !VISIBLE,
    slowMo: VISIBLE ? 35 : 0,
    defaultViewport: null,
    args: (process.env.CHROME_ARGS || '').split(' ').filter(Boolean),
  };
  if (process.env.CHROME_PATH) {
    const { default: puppeteer } = await import('puppeteer-core');
    return puppeteer.launch({ ...options, executablePath: process.env.CHROME_PATH });
  }
  const { default: puppeteer } = await import('puppeteer');
  return puppeteer.launch(options);
}

// Rapport lisible dans le terminal
export function journal() {
  const lignes = [];
  const erreursConsole = [];
  let etape = 0;
  return {
    erreursConsole,
    titre(t) { etape += 1; console.log(`\n${etape}. ${t}`); },
    ok(t) { lignes.push(t); console.log(`   ✔ ${t}`); },
    verifier(condition, t) { if (!condition) throw new Error(`Vérification échouée : ${t}`); this.ok(t); },
    bilan() { return lignes.length; },
  };
}

// Une session = un utilisateur (contexte isolé : cookies et stockage séparés)
export async function session(navigateur, j, { largeur = 1366, hauteur = 860, gps = null } = {}) {
  const contexte = await navigateur.createBrowserContext();
  if (gps) await contexte.overridePermissions(URL_APP, ['geolocation']);
  const page = await contexte.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  if (gps) await page.setGeolocation(gps);
  page.on('pageerror', (e) => j.erreursConsole.push(e.message));
  page.on('console', (m) => {
    // Les refus HTTP attendus (401/403/404/409) et le réseau externe (tuiles) ne sont pas des erreurs de l'application
    if (m.type() === 'error' && !/status of (401|403|404|409)|Failed to load resource/i.test(m.text())) j.erreursConsole.push(m.text());
  });
  return page;
}

export const texte = (p) => p.evaluate(() => document.body.innerText);
export const attendreTexte = (p, t, delai = 20000) => p.waitForFunction((t) => document.body.innerText.includes(t), { timeout: delai }, t);
export const attendreChemin = (p, motif, delai = 20000) => p.waitForFunction((m) => new RegExp(m).test(location.pathname), { timeout: delai }, motif);

// Clique (vrai clic de souris) sur un bouton ou un lien repéré par son texte ou son aria-label
export async function cliquer(p, libelle, zone = '') {
  const element = await p.waitForFunction((l, z) => [...document.querySelectorAll(`${z} button, ${z} a, ${z} [role=tab], ${z} label`)]
    .find((x) => (x.textContent.trim() === l || x.getAttribute('aria-label') === l) && x.offsetParent !== null && !x.disabled),
  { timeout: 20000 }, libelle, zone);
  await element.asElement().click();
}

// Saisie dans un champ repéré par son libellé visible
export async function remplir(p, libelle, valeur) {
  const id = await p.waitForFunction((l) => [...document.querySelectorAll('label')]
    .find((x) => x.textContent.replace('*', '').trim() === l)?.htmlFor, { timeout: 20000 }, libelle).then((h) => h.jsonValue());
  await p.click(`[id="${id}"]`, { clickCount: 3 });
  await p.type(`[id="${id}"]`, valeur);
}

export async function connecter(p, email, motDePasse) {
  await p.goto(`${URL_APP}/connexion`, { waitUntil: 'networkidle2' });
  for (const [champ, valeur] of [['input[type=email]', email], ['input[type=password]', motDePasse]]) {
    await p.click(champ); // le champ peut être prérempli (retour d'inscription) : on le vide d'abord
    await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
    await p.keyboard.press('Backspace');
    await p.type(champ, valeur);
  }
  await p.click('button[type=submit]');
  await p.waitForFunction(() => !location.pathname.startsWith('/connexion'), { timeout: 20000 });
}

export async function api(chemin, { methode = 'GET', jeton, corps } = {}) {
  const r = await fetch(`${URL_API}${chemin}`, {
    method: methode, headers: { 'Content-Type': 'application/json', ...(jeton && { Authorization: `Bearer ${jeton}` }) }, body: corps && JSON.stringify(corps),
  });
  const json = r.status === 204 ? null : await r.json();
  if (!r.ok) throw new Error(`${methode} ${chemin} → ${r.status} ${JSON.stringify(json)}`);
  return json;
}

export function imagePng(chemin) {
  // Image PNG valide (1×1 pixel) pour les champs « photo »
  fs.writeFileSync(chemin, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  return chemin;
}

export async function cliquerCarte(p, fx, fy) {
  const carte = await (await p.waitForSelector('.leaflet-container')).boundingBox();
  await p.mouse.click(carte.x + carte.width * fx, carte.y + carte.height * fy);
}
