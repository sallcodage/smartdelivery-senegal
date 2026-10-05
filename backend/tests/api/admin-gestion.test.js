// Compléments aux tests de tests/api/administration.test.js
const h = require('../helpers');

afterAll(() => h.pool.end());

describe('Tarification : simulation avant enregistrement', () => {
  test('même formule que les commandes, aucun paramètre modifié en base', async () => {
    const admin = await h.creerAdmin();
    const avant = (await h.api().get('/api/tarification').set(h.auth(admin))).body.parametres;
    const res = await h.api().post('/api/admin/tarification/simulation').set(h.auth(admin))
      .send({ prixBase: 1000, prixParKm: 100, montantMinimum: 1500, arrondi: 100, partLivreurPourcentage: 75 }).expect(200);
    expect(res.body.exemples.find((e) => e.distanceKm === 1)).toMatchObject({ montant: 1500, partLivreur: 1125 });
    expect(res.body.exemples.find((e) => e.distanceKm === 10)).toMatchObject({ montant: 2000, partLivreur: 1500 });
    expect((await h.api().get('/api/tarification').set(h.auth(admin))).body.parametres).toEqual(avant);
    await h.api().post('/api/admin/tarification/simulation').set(h.auth(admin)).send({ prixBase: -1 }).expect(400);
  });
});

describe('Export CSV : caractères spéciaux', () => {
  test('« ; » et guillemets dans un nom sont correctement échappés', async () => {
    const admin = await h.creerAdmin();
    const client = await h.inscrireEtConnecterClient({ prenom: 'Aïda', nom: 'Diop; "Test"' });
    const c = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande()).expect(201)).body.commande;
    const res = await h.api().get(`/api/admin/commandes/export?clientId=${client.id}`).set(h.auth(admin)).buffer(true).expect(200);
    const ligne = res.text.split('\r\n').find((l) => l.startsWith(c.numero));
    expect(ligne).toContain('"Aïda Diop; ""Test"""');
  });
});

describe('Carte des livraisons actives', () => {
  test('position du livreur : trajet en cours, sinon dernière position connue, sinon aucune', async () => {
    const admin = await h.creerAdmin();
    const client = await h.inscrireEtConnecterClient();
    const livreur = await h.creerLivreurActif(admin);
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true });
    const c = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande()).expect(201)).body.commande;
    await h.api().post(`/api/commandes/${c.id}/valider`).set(h.auth(admin)).expect(200);
    await h.api().post(`/api/commandes/${c.id}/affecter`).set(h.auth(admin)).send({ livreurId: livreur.id }).expect(200);
    const ligne = async () => (await h.api().get('/api/admin/livraisons/actives').set(h.auth(admin))).body.livraisons.find((l) => l.id === c.id);

    expect((await ligne()).positionLivreur).toBeNull();
    await h.api().patch('/api/livreurs/moi/position').set(h.auth(livreur)).send(h.LIEUX.medina).expect(200);
    expect((await ligne()).positionLivreur).toMatchObject({ latitude: h.LIEUX.medina.latitude, source: 'DERNIERE_CONNUE' });

    await h.api().post(`/api/commandes/${c.id}/accepter`).set(h.auth(livreur)).expect(200);
    await h.api().post(`/api/commandes/${c.id}/demarrer`).set(h.auth(livreur)).expect(200);
    await h.api().post(`/api/commandes/${c.id}/positions`).set(h.auth(livreur)).send(h.LIEUX.ouakam).expect(201);
    expect((await ligne()).positionLivreur).toMatchObject({ latitude: h.LIEUX.ouakam.latitude, source: 'LIVRAISON' });
  });
});
