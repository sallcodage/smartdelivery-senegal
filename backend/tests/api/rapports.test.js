// Phase 13 : rapports PDF. Le texte du PDF est relu (pdf-parse) pour vérifier les chiffres imprimés.
const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // chemin direct : évite le code de démonstration du module
const h = require('../helpers');

afterAll(() => h.pool.end());

const aujourdhui = new Date().toISOString().slice(0, 10);
const fcfa = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
const binaire = (res, cb) => { const morceaux = []; res.on('data', (m) => morceaux.push(m)); res.on('end', () => cb(null, Buffer.concat(morceaux))); };

async function telecharger(admin, id, telecharger = false) {
  return h.api().get(`/api/admin/rapports/${id}/pdf${telecharger ? '?telecharger=1' : ''}`).set(h.auth(admin)).buffer(true).parse(binaire).expect(200);
}

describe('Rapports PDF', () => {
  let admin;
  beforeAll(async () => {
    admin = await h.creerAdmin();
    // Activité réelle : une commande livrée, confirmée et notée
    const client = await h.inscrireEtConnecterClient();
    const livreur = await h.creerLivreurActif(admin, { prenom: 'Ndeye', nom: 'Rapport' });
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true });
    const c = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande()).expect(201)).body.commande;
    await h.api().post(`/api/commandes/${c.id}/valider`).set(h.auth(admin)).expect(200);
    await h.api().post(`/api/commandes/${c.id}/affecter`).set(h.auth(admin)).send({ livreurId: livreur.id }).expect(200);
    for (const a of ['accepter', 'demarrer', 'terminer']) await h.api().post(`/api/commandes/${c.id}/${a}`).set(h.auth(livreur)).expect(200);
    await h.api().post(`/api/commandes/${c.id}/confirmer`).set(h.auth(client)).send({ note: 5 }).expect(200);
  });

  test.each(['ACTIVITE_GLOBALE', 'PERFORMANCE_LIVREURS', 'FINANCIER'])('%s : PDF généré, enregistré, KPI figés et chiffres imprimés exacts', async (type) => {
    const res = await h.api().post('/api/admin/rapports').set(h.auth(admin)).send({ type, periodeDebut: aujourdhui, periodeFin: aujourdhui }).expect(201);
    const r = res.body.rapport;
    expect(r).toMatchObject({ type, periodeDebut: aujourdhui, periodeFin: aujourdhui, disponible: true, auteur: `${admin.prenom} ${admin.nom}` });
    expect(r.tailleOctets).toBeGreaterThan(2000);
    expect(r.nomFichier).toMatch(/^rapport-(activite|livreurs|financier)-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}-[0-9a-f]{8}\.pdf$/);

    // KPI figés en base = KPI calculés sur la même période
    const { rows } = await h.pool.query('SELECT nom, valeur FROM kpis WHERE rapport_id = $1', [r.id]);
    const fige = Object.fromEntries(rows.map((x) => [x.nom, Number(x.valeur)]));
    const kpiService = require('../../src/services/kpiService');
    const reference = await kpiService.indicateurs(aujourdhui, aujourdhui);
    expect(fige['Commandes créées']).toBe(reference.totalCommandes);
    expect(fige["Chiffre d'affaires"]).toBe(reference.chiffreAffaires);
    expect(r.kpis.length).toBe(rows.length);

    // Contenu du PDF
    const fichier = await telecharger(admin, r.id);
    expect(fichier.headers['content-type']).toBe('application/pdf');
    expect(fichier.headers['content-disposition']).toMatch(/^inline/);
    expect(fichier.headers['cache-control']).toBe('private, no-store');
    expect(fichier.body.subarray(0, 5).toString()).toBe('%PDF-');
    const { text, numpages } = await pdfParse(fichier.body);
    expect(numpages).toBeGreaterThanOrEqual(1);
    expect(text).toContain(r.titre);
    expect(text).toContain('SmartDelivery');
    expect(text).toContain(`Page 1 / ${numpages}`);
    expect(text).toContain('Méthode de calcul');
    const jour = new Date(aujourdhui).toLocaleDateString('fr-FR', { timeZone: 'Africa/Dakar' });
    expect(text).toContain(`du ${jour} au ${jour}`);
    if (type === 'FINANCIER') expect(text).toContain(fcfa(reference.chiffreAffaires));
    if (type === 'ACTIVITE_GLOBALE') expect(text).toContain(String(reference.totalCommandes));
    if (type === 'PERFORMANCE_LIVREURS') expect(text).toContain('Ndeye Rapport');
  });

  test('période sans activité : PDF valide avec « Aucune donnée »', async () => {
    const r = (await h.api().post('/api/admin/rapports').set(h.auth(admin))
      .send({ type: 'FINANCIER', periodeDebut: '2021-01-01', periodeFin: '2021-01-31' }).expect(201)).body.rapport;
    const { text } = await pdfParse((await telecharger(admin, r.id, true)).body);
    expect(text).toContain('0 FCFA');
    expect(text).toContain('Aucune donnée sur cette période');
  });

  test('liste (plus récent en premier), consultation, téléchargement', async () => {
    const liste = (await h.api().get('/api/admin/rapports?limite=5').set(h.auth(admin)).expect(200)).body;
    expect(liste.donnees.length).toBeGreaterThan(0);
    const dates = liste.donnees.map((r) => new Date(r.dateGeneration).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    const detail = (await h.api().get(`/api/admin/rapports/${liste.donnees[0].id}`).set(h.auth(admin)).expect(200)).body.rapport;
    expect(detail.kpis.length).toBeGreaterThan(0);
    const fichier = await telecharger(admin, detail.id, true);
    expect(fichier.headers['content-disposition']).toMatch(/^attachment; filename="rapport-/);
    const filtre = (await h.api().get('/api/admin/rapports?type=FINANCIER').set(h.auth(admin)).expect(200)).body;
    expect(filtre.donnees.every((r) => r.type === 'FINANCIER')).toBe(true);
  });

  test('validation et sécurité', async () => {
    const envoyer = (corps) => h.api().post('/api/admin/rapports').set(h.auth(admin)).send(corps);
    await envoyer({ type: 'FINANCIER', periodeDebut: '2026-05-10', periodeFin: '2026-05-01' }).expect(400);
    await envoyer({ type: 'BILAN', periodeDebut: '2026-01-01', periodeFin: '2026-01-31' }).expect(400);
    await envoyer({ type: 'FINANCIER', periodeDebut: aujourdhui, periodeFin: '2999-12-31' }).expect(400);
    await envoyer({ type: 'FINANCIER', periodeDebut: '01/01/2026', periodeFin: aujourdhui }).expect(400);
    const client = await h.inscrireEtConnecterClient();
    await h.api().get('/api/admin/rapports').set(h.auth(client)).expect(403);
    await h.api().post('/api/admin/rapports').set(h.auth(client)).send({ type: 'FINANCIER', periodeDebut: aujourdhui, periodeFin: aujourdhui }).expect(403);
    await h.api().get('/api/admin/rapports/00000000-0000-4000-8000-000000000000/pdf').set(h.auth(admin)).expect(404);
    await h.api().get('/api/admin/rapports/00000000-0000-4000-8000-000000000000/pdf').expect(401);
  });
});
