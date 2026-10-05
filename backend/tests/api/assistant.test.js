// Phase 14 : assistant IA. L'API Gemini est SIMULÉE (format officiel generateContent) ;
// les données (commandes, tarifs) viennent de la vraie base PostgreSQL de test.
const h = require('../helpers');
const tarifService = require('../../src/services/tarifService');
const { distanceKm, arrondir } = require('../../src/utils/geo');

const CLE = 'cle-de-test-gemini-ne-doit-jamais-fuiter';
let scenario; // fonction (corps de la requête, n° d'appel) → réponse Gemini
let requetesGemini;
const fetchOriginal = global.fetch;

const texte = (t, signature) => ({ candidates: [{ content: { role: 'model', parts: [{ text: t, ...(signature && { thoughtSignature: signature }) }] }, finishReason: 'STOP' }] });
const appelFonction = (name, args, signature = 'signature-A') => ({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name, args }, thoughtSignature: signature }] }, finishReason: 'STOP' }] });
const reponseHttp = (status, corps) => ({ ok: status < 400, status, json: async () => corps, text: async () => JSON.stringify(corps) });
const resultatOutil = (corps, i = -1) => corps.contents.at(i).parts[0].functionResponse.response.output;

beforeAll(() => {
  global.fetch = jest.fn(async (url, options) => {
    if (url.startsWith('https://generativelanguage.googleapis.com/')) {
      const corps = JSON.parse(options.body);
      requetesGemini.push({ url, headers: options.headers, corps });
      return scenario(corps, requetesGemini.length, options.signal);
    }
    if (url.startsWith('https://nominatim.openstreetmap.org/')) {
      const q = new URL(url).searchParams.get('q');
      const lieux = { 'Plateau, Dakar': [14.6692, -17.4374], 'Almadies, Dakar': [14.7453, -17.5134] };
      return reponseHttp(200, lieux[q] ? [{ lat: String(lieux[q][0]), lon: String(lieux[q][1]), display_name: `${q}, Sénégal` }] : []);
    }
    throw new Error(`Appel réseau inattendu : ${url}`);
  });
});
afterAll(async () => { global.fetch = fetchOriginal; await h.pool.end(); });
beforeEach(() => {
  requetesGemini = [];
  Object.assign(process.env, { IA_FOURNISSEUR: 'gemini', IA_MODELE: 'gemini-3.5-flash', IA_CLE_API: CLE, IA_DELAI_MS: '1500' });
});

const demander = (client, question) => h.api().post('/api/assistant/questions').set(h.auth(client)).send({ question });

async function clientAvecCommandeEnCours() {
  const admin = await h.creerAdmin();
  const client = await h.inscrireEtConnecterClient({ prenom: 'Mame', nom: 'Diarra' });
  const livreur = await h.creerLivreurActif(admin, { prenom: 'Lamine', nom: 'Seck' });
  await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true });
  const c = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande()).expect(201)).body.commande;
  await h.api().post(`/api/commandes/${c.id}/valider`).set(h.auth(admin)).expect(200);
  await h.api().post(`/api/commandes/${c.id}/affecter`).set(h.auth(admin)).send({ livreurId: livreur.id }).expect(200);
  for (const a of ['accepter', 'demarrer']) await h.api().post(`/api/commandes/${c.id}/${a}`).set(h.auth(livreur)).expect(200);
  await h.api().post(`/api/commandes/${c.id}/positions`).set(h.auth(livreur)).send(h.LIEUX.ouakam).expect(201);
  return { client, commande: c };
}

describe('Assistant IA (Gemini)', () => {
  test('question générale : réponse de Gemini enregistrée ; clé uniquement dans l\'en-tête', async () => {
    scenario = () => reponseHttp(200, texte('Bonjour ! Je peux suivre vos commandes et estimer un prix.', 'sig-texte'));
    const client = await h.inscrireEtConnecterClient();
    const res = await demander(client, 'Bonjour, que peux-tu faire ?').expect(201);
    expect(res.body).toMatchObject({ mode: 'ia', avertissement: null });
    expect(res.body.conversation.reponse).toContain('suivre vos commandes');

    const [requete] = requetesGemini;
    expect(requete.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent');
    expect(requete.headers['x-goog-api-key']).toBe(CLE);
    expect(requete.url).not.toContain(CLE);
    expect(JSON.stringify(requete.corps)).not.toContain(CLE);
    expect(requete.corps.systemInstruction.parts[0].text).toContain("N'invente JAMAIS");
    expect(requete.corps.tools[0].functionDeclarations.map((f) => f.name)).toEqual(['consulter_commande', 'lister_mes_commandes', 'estimer_tarif', 'informations_service']);

    const { rows } = await h.pool.query('SELECT fournisseur, modele, question, reponse FROM conversations_ia WHERE id = $1', [res.body.conversation.id]);
    expect(rows[0]).toMatchObject({ fournisseur: 'gemini', modele: 'gemini-3.5-flash', question: 'Bonjour, que peux-tu faire ?' });
    expect(JSON.stringify(rows[0])).not.toContain(CLE);
  });

  test('« Où est ma commande ? » : Gemini appelle consulter_commande ; données réelles ; signature de réflexion renvoyée', async () => {
    const { client, commande } = await clientAvecCommandeEnCours();
    scenario = (corps, n) => {
      if (n === 1) return reponseHttp(200, appelFonction('consulter_commande', { numero: commande.numero }, 'signature-gemini-3'));
      const r = resultatOutil(corps);
      return reponseHttp(200, texte(`Votre commande ${r.numero} est « ${r.statut} ». Votre livreur ${r.livreur.nom} arrive dans environ ${r.suivi_gps.duree_restante_estimee_min} min.`));
    };
    const res = await demander(client, `Où en est ma commande ${commande.numero} ?`).expect(201);

    // 2e requête : le tour du modèle est renvoyé TEL QUEL (signature), puis la réponse de l'outil
    const corps2 = requetesGemini[1].corps;
    expect(corps2.contents.at(-2)).toEqual({ role: 'model', parts: [{ functionCall: { name: 'consulter_commande', args: { numero: commande.numero } }, thoughtSignature: 'signature-gemini-3' }] });
    const r = resultatOutil(corps2);
    expect(r).toMatchObject({ trouve: true, numero: commande.numero, statut: 'En cours', livreur: { nom: 'Lamine Seck' } });
    expect(r.suivi_gps.distance_restante_km).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toMatch(/latitude|longitude/); // pas de coordonnées brutes transmises à l'IA

    expect(res.body.mode).toBe('ia');
    expect(res.body.conversation.reponse).toContain('Lamine Seck');
    expect(res.body.conversation.commandeNumero).toBe(commande.numero);
    expect(res.body.outilsUtilises).toEqual(['consulter_commande']);
    const { rows } = await h.pool.query('SELECT commande_id FROM conversations_ia WHERE id = $1', [res.body.conversation.id]);
    expect(rows[0].commande_id).toBe(commande.id);
  });

  test('commande d\'un autre client ou inexistante : aucune donnée transmise, l\'assistant dit ne pas savoir', async () => {
    const { commande } = await clientAvecCommandeEnCours();
    const autre = await h.inscrireEtConnecterClient();
    scenario = (corps, n) => (n === 1
      ? reponseHttp(200, appelFonction('consulter_commande', { numero: commande.numero }))
      : reponseHttp(200, texte(`Je ne dispose d'aucune information sur la commande ${commande.numero} dans votre compte.`)));
    const res = await demander(autre, `Où est la commande ${commande.numero} ?`).expect(201);
    const r = resultatOutil(requetesGemini[1].corps);
    expect(r).toMatchObject({ trouve: false });
    expect(JSON.stringify(r)).not.toMatch(/Lamine|En cours|montant/);
    expect(res.body.conversation.reponse).toContain('aucune information');
    expect(res.body.conversation.commandeNumero).toBeNull();
  });

  test('estimation : prix calculé par la formule du backend (adresses géocodées ou distance)', async () => {
    const client = await h.inscrireEtConnecterClient();
    const params = await tarifService.obtenirParametres();
    scenario = (corps, n) => {
      if (n === 1) return reponseHttp(200, appelFonction('estimer_tarif', { adresse_depart: 'Plateau, Dakar', adresse_arrivee: 'Almadies, Dakar' }));
      const r = resultatOutil(corps);
      return reponseHttp(200, texte(`Pour ce trajet de ${String(r.distance_km).replace('.', ',')} km, le prix estimé est de ${r.montant_fcfa.toLocaleString('fr-FR')} FCFA.`));
    };
    const res = await demander(client, 'Combien pour livrer du Plateau aux Almadies ?').expect(201);
    const r = resultatOutil(requetesGemini[1].corps);
    const attendu = arrondir(distanceKm(14.6692, -17.4374, 14.7453, -17.5134));
    expect(r).toMatchObject({ possible: true, distance_km: attendu, montant_fcfa: tarifService.calculerMontant(attendu, params) });
    expect(res.body.mode).toBe('ia');

    scenario = (corps, n) => (n === 1
      ? reponseHttp(200, appelFonction('estimer_tarif', { distance_km: 8 }))
      : reponseHttp(200, texte(`Environ ${resultatOutil(corps).montant_fcfa} FCFA pour 8 km.`)));
    requetesGemini = [];
    await demander(client, 'Et pour 8 km ?').expect(201);
    expect(resultatOutil(requetesGemini[1].corps).montant_fcfa).toBe(tarifService.calculerMontant(8, params));

    scenario = (corps, n) => (n === 1
      ? reponseHttp(200, appelFonction('estimer_tarif', { adresse_depart: 'Rue imaginaire 999', adresse_arrivee: 'Almadies, Dakar' }))
      : reponseHttp(200, texte("Je n'ai pas trouvé l'adresse de départ.")));
    requetesGemini = [];
    await demander(client, 'Prix depuis la rue imaginaire ?').expect(201);
    expect(resultatOutil(requetesGemini[1].corps)).toMatchObject({ possible: false });
  });

  test('garde-fou : un prix ou un numéro inventé est rejeté et remplacé par les données réelles', async () => {
    const { client, commande } = await clientAvecCommandeEnCours();
    scenario = () => reponseHttp(200, texte(`Votre commande ${commande.numero} coûtera 99 999 FCFA et arrivera dans 3 min.`));
    const res = await demander(client, `Où est ${commande.numero} ?`).expect(201);
    expect(res.body.mode).toBe('secours');
    expect(res.body.avertissement).toMatch(/non vérifiable/);
    expect(res.body.conversation.reponse).not.toContain('99 999');
    expect(res.body.conversation.reponse).toContain('« En cours »');
    expect(res.body.conversation.reponse).toContain(`${commande.montant.toLocaleString('fr-FR').replace(/\s/g, ' ')}`.replace(/\u202f/g, ' '));

    scenario = () => reponseHttp(200, texte('Votre commande CMD-987654 est livrée.'));
    const res2 = await demander(client, 'Et mon autre colis ?').expect(201);
    expect(res2.body.mode).toBe('secours');
    expect(res2.body.conversation.reponse).not.toContain('CMD-987654');
  });

  test.each([
    ['indisponibilité (503)', () => reponseHttp(503, { error: { message: 'overloaded' } })],
    ['quota dépassé (429)', () => reponseHttp(429, { error: { message: 'quota' } })],
    ['clé refusée (403)', () => reponseHttp(403, { error: { message: 'API key not valid' } })],
    // Comme un vrai fetch : la requête est interrompue quand le délai expire (signal)
    ['délai dépassé', (corps, n, signal) => new Promise((_, rejeter) => signal.addEventListener('abort', () => rejeter(signal.reason)))],
    ['erreur réseau', () => { throw new TypeError('fetch failed'); }],
    ['réponse bloquée', () => reponseHttp(200, { promptFeedback: { blockReason: 'SAFETY' } })],
  ])('%s : mode secours avec les vraies données, échange enregistré', async (cas, panne) => {
    const { client, commande } = await clientAvecCommandeEnCours();
    scenario = panne;
    const res = await demander(client, `Où en est ${commande.numero} ?`).expect(201);
    expect(res.body.mode).toBe('secours');
    expect(res.body.avertissement).toMatch(/indisponible/);
    expect(res.body.conversation.reponse).toMatch(new RegExp(`${commande.numero}.*« En cours ».*Lamine Seck`));
    const { rows } = await h.pool.query('SELECT fournisseur, modele FROM conversations_ia WHERE id = $1', [res.body.conversation.id]);
    expect(rows[0]).toEqual({ fournisseur: 'secours', modele: null });
  });

  test('sans clé configurée : état « indisponible » et réponses de secours', async () => {
    process.env.IA_CLE_API = '';
    const client = await h.inscrireEtConnecterClient();
    expect((await h.api().get('/api/assistant/etat').set(h.auth(client)).expect(200)).body).toEqual({ disponible: false, fournisseur: null, modele: null });
    const res = await demander(client, 'Où est ma commande ?').expect(201);
    expect(res.body.mode).toBe('secours');
    expect(res.body.avertissement).toMatch(/pas configuré/);
    expect(res.body.conversation.reponse).toContain("Vous n'avez aucune commande en cours");
    expect(requetesGemini).toHaveLength(0);
    process.env.IA_CLE_API = CLE;
    expect((await h.api().get('/api/assistant/etat').set(h.auth(client))).body).toEqual({ disponible: true, fournisseur: 'gemini', modele: 'gemini-3.5-flash' });
  });

  test('historique : propre à chaque client, du plus récent au plus ancien ; mémoire envoyée à Gemini', async () => {
    scenario = (corps) => reponseHttp(200, texte(`Réponse ${corps.contents.length}`));
    const client = await h.inscrireEtConnecterClient();
    await demander(client, 'Première question').expect(201);
    await demander(client, 'Deuxième question').expect(201);
    expect(requetesGemini[1].corps.contents.map((c) => c.parts[0].text)).toEqual(['Première question', 'Réponse 1', 'Deuxième question']);
    const hist = (await h.api().get('/api/assistant/historique').set(h.auth(client)).expect(200)).body;
    expect(hist.donnees.map((x) => x.question)).toEqual(['Deuxième question', 'Première question']);
    const autre = await h.inscrireEtConnecterClient();
    expect((await h.api().get('/api/assistant/historique').set(h.auth(autre))).body.donnees).toHaveLength(0);
  });

  test('validation et rôles', async () => {
    const client = await h.inscrireEtConnecterClient();
    await demander(client, '').expect(400);
    await demander(client, 'x'.repeat(1001)).expect(400);
    const admin = await h.creerAdmin();
    await demander(admin, 'Bonjour').expect(403);
    await h.api().post('/api/assistant/questions').send({ question: 'Bonjour' }).expect(401);
  });
});

describe('Changement de fournisseur via .env (adaptateurs OpenAI et Anthropic)', () => {
  test('OpenAI : appel d\'outil puis réponse, même logique d\'assistant', async () => {
    Object.assign(process.env, { IA_FOURNISSEUR: 'openai', IA_MODELE: 'modele-openai-test' });
    const appels = [];
    const precedent = global.fetch;
    global.fetch = jest.fn(async (url, options) => {
      if (!url.startsWith('https://api.openai.com/')) return precedent(url, options);
      const corps = JSON.parse(options.body); appels.push({ options, corps });
      if (appels.length === 1) return reponseHttp(200, { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'appel-1', type: 'function', function: { name: 'informations_service', arguments: '{}' } }] } }] });
      const zones = JSON.parse(corps.messages.at(-1).content).zones_desservies;
      return reponseHttp(200, { choices: [{ message: { role: 'assistant', content: `Nous livrons à : ${zones.join(', ')}.` } }] });
    });
    const client = await h.inscrireEtConnecterClient();
    const res = await demander(client, 'Quelles zones desservez-vous ?').expect(201);
    global.fetch = precedent;
    expect(appels[0].options.headers.Authorization).toBe(`Bearer ${CLE}`);
    expect(res.body).toMatchObject({ mode: 'ia', outilsUtilises: ['informations_service'] });
    expect(res.body.conversation.reponse).toContain('Pikine');
  });

  test('Anthropic : appel d\'outil puis réponse', async () => {
    Object.assign(process.env, { IA_FOURNISSEUR: 'anthropic', IA_MODELE: 'modele-anthropic-test' });
    const appels = [];
    const precedent = global.fetch;
    global.fetch = jest.fn(async (url, options) => {
      if (!url.startsWith('https://api.anthropic.com/')) return precedent(url, options);
      const corps = JSON.parse(options.body); appels.push({ options, corps });
      if (appels.length === 1) return reponseHttp(200, { content: [{ type: 'tool_use', id: 'outil-1', name: 'lister_mes_commandes', input: { filtre: 'toutes' } }], stop_reason: 'tool_use' });
      const r = JSON.parse(corps.messages.at(-1).content[0].content);
      return reponseHttp(200, { content: [{ type: 'text', text: `Vous avez ${r.nombre_total} commande(s).` }] });
    });
    const client = await h.inscrireEtConnecterClient();
    const res = await demander(client, 'Combien de commandes ai-je ?').expect(201);
    global.fetch = precedent;
    expect(appels[0].options.headers['x-api-key']).toBe(CLE);
    expect(res.body.conversation.reponse).toBe('Vous avez 0 commande(s).');
  });
});

describe('Sécurité de la clé', () => {
  test('aucune clé d\'API écrite dans le code source', () => {
    const fs = require('fs'); const path = require('path');
    const motifs = [/AIza[0-9A-Za-z_-]{35}/, /sk-[A-Za-z0-9_-]{20,}/, /sk-ant-[A-Za-z0-9_-]{20,}/];
    const parcourir = (dossier) => fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
      const chemin = path.join(dossier, e.name);
      if (['node_modules', 'dist', 'uploads', 'rapports', 'uploads-temp', 'rapports-temp'].includes(e.name)) return [];
      return e.isDirectory() ? parcourir(chemin) : /\.(js|jsx|json|md|example)$/.test(e.name) ? [chemin] : [];
    });
    const racine = path.join(__dirname, '..', '..', '..');
    const fichiers = [...parcourir(path.join(racine, 'backend')), ...parcourir(path.join(racine, 'frontend', 'src'))];
    expect(fichiers.length).toBeGreaterThan(50);
    const fuites = fichiers.filter((f) => motifs.some((m) => m.test(fs.readFileSync(f, 'utf8'))));
    expect(fuites).toEqual([]);
    const gitignore = fs.readFileSync(path.join(racine, '.gitignore'), 'utf8');
    expect(gitignore).toMatch(/^\.env$/m);
  });
});
