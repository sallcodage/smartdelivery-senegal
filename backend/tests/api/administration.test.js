const h = require('../helpers');

afterAll(() => h.pool.end());

describe('Administration des commandes', () => {
  let admin; let client; let autreClient; let livreur; let c1; let c2;

  beforeAll(async () => {
    admin = await h.creerAdmin();
    client = await h.inscrireEtConnecterClient({ prenom: 'Ndèye', nom: 'Faye' });
    autreClient = await h.inscrireEtConnecterClient();
    livreur = await h.creerLivreurActif(admin);
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true });
    c1 = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande(h.LIEUX.plateau, h.LIEUX.almadies)).expect(201)).body.commande;
    c2 = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande(h.LIEUX.medina, h.LIEUX.pikine, { zoneId: 2 })).expect(201)).body.commande;
    await h.api().post(`/api/commandes/${c2.id}/valider`).set(h.auth(admin)).expect(200);
    await h.api().post(`/api/commandes/${c2.id}/affecter`).set(h.auth(admin)).send({ livreurId: livreur.id }).expect(200);
  });

  test('filtres : client, livreur, zone et période', async () => {
    const parClient = (await h.api().get(`/api/commandes?clientId=${client.id}`).set(h.auth(admin)).expect(200)).body;
    expect(parClient.donnees.map((c) => c.id).sort()).toEqual([c1.id, c2.id].sort());
    const parLivreur = (await h.api().get(`/api/commandes?livreurId=${livreur.id}`).set(h.auth(admin))).body;
    expect(parLivreur.donnees.map((c) => c.id)).toEqual([c2.id]);
    const parZone = (await h.api().get(`/api/commandes?zoneId=2&clientId=${client.id}`).set(h.auth(admin))).body;
    expect(parZone.donnees.map((c) => c.id)).toEqual([c2.id]);
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const periode = (await h.api().get(`/api/commandes?du=${aujourdhui}&au=${aujourdhui}&clientId=${client.id}`).set(h.auth(admin))).body;
    expect(periode.pagination.total).toBe(2);
    const passe = (await h.api().get(`/api/commandes?au=2020-01-01&clientId=${client.id}`).set(h.auth(admin))).body;
    expect(passe.pagination.total).toBe(0);
    await h.api().get('/api/commandes?du=hier').set(h.auth(admin)).expect(400);
  });

  test('un client ne peut pas filtrer sur les commandes d\'un autre client', async () => {
    const res = (await h.api().get(`/api/commandes?clientId=${client.id}`).set(h.auth(autreClient)).expect(200)).body;
    expect(res.donnees).toHaveLength(0);
  });

  test('compteurs par statut', async () => {
    const { total, parStatut } = (await h.api().get('/api/admin/commandes/compteurs').set(h.auth(admin)).expect(200)).body;
    expect(parStatut.NOUVELLE).toBeGreaterThanOrEqual(1);
    expect(parStatut.LIVREUR_AFFECTE).toBeGreaterThanOrEqual(1);
    expect(total).toBe(Object.values(parStatut).reduce((a, b) => a + b, 0));
    await h.api().get('/api/admin/commandes/compteurs').set(h.auth(client)).expect(403);
  });

  test('export CSV compatible Excel (BOM, « ; », virgule décimale, filtres appliqués)', async () => {
    const res = await h.api().get(`/api/admin/commandes/export?clientId=${client.id}`).set(h.auth(admin)).buffer(true).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="commandes-smartdelivery-\d{4}-\d{2}-\d{2}\.csv"/);
    const texte = res.text;
    expect(texte.charCodeAt(0)).toBe(0xfeff);
    const lignes = texte.trim().split('\r\n');
    expect(lignes[0]).toContain('Numéro;Date;Client');
    expect(lignes).toHaveLength(3);
    const ligneC2 = lignes.find((l) => l.startsWith(c2.numero));
    expect(ligneC2).toContain('Ndèye Faye');
    expect(ligneC2).toContain('Affectée');
    expect(ligneC2).toMatch(/;\d+,\d+;/); // distance avec virgule décimale
    await h.api().get('/api/admin/commandes/export').set(h.auth(livreur)).expect(403);
  });

  test('performances d\'un livreur consultables par l\'admin', async () => {
    const res = await h.api().get(`/api/admin/livreurs/${livreur.id}/performances?periode=7j`).set(h.auth(admin)).expect(200);
    expect(res.body.performances).toMatchObject({ periode: '7j', livraisonsActives: 1 });
    await h.api().get('/api/admin/livreurs/00000000-0000-4000-8000-000000000000/performances').set(h.auth(admin)).expect(404);
    await h.api().get(`/api/admin/livreurs/${livreur.id}/performances`).set(h.auth(livreur)).expect(403);
  });
});
