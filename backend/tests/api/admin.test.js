const h = require('../helpers');

afterAll(() => h.pool.end());

describe('Gestion des utilisateurs (administrateur)', () => {
  let admin;
  beforeAll(async () => { admin = await h.creerAdmin(); });

  test('liste paginée filtrable par rôle, avec compteurs par onglet et sans mot de passe', async () => {
    await h.inscrireEtConnecterClient();
    const res = await h.api().get('/api/admin/utilisateurs?role=CLIENT&limite=5').set(h.auth(admin)).expect(200);
    expect(res.body.donnees.every((u) => u.role === 'CLIENT')).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, limite: 5 });
    expect(res.body.compteurs.TOUS).toBeGreaterThanOrEqual(res.body.compteurs.CLIENT);
    expect(JSON.stringify(res.body)).not.toMatch(/\$2b\$|motDePasse/);
  });

  test('l\'admin crée un livreur (actif d\'office) et un autre administrateur', async () => {
    const livreur = await h.api().post('/api/admin/utilisateurs').set(h.auth(admin)).send({
      role: 'LIVREUR', nom: 'Gueye', prenom: 'Pape', email: `pape.${h.unique()}@test.sn`,
      telephone: h.telephoneUnique(), motDePasse: h.MOT_DE_PASSE, vehicule: 'SCOOTER',
    }).expect(201);
    expect(livreur.body.utilisateur).toMatchObject({ role: 'LIVREUR', statutCompte: 'ACTIF', vehicule: 'SCOOTER' });

    const email = `serigne.${h.unique()}@test.sn`;
    await h.api().post('/api/admin/utilisateurs').set(h.auth(admin)).send({
      role: 'ADMIN', nom: 'Kane', prenom: 'Serigne', email, telephone: h.telephoneUnique(), motDePasse: h.MOT_DE_PASSE,
    }).expect(201);
    expect((await h.connecter(email)).role).toBe('ADMIN');
  });

  test('un client sans adresse ou un livreur sans véhicule sont refusés', async () => {
    const res = await h.api().post('/api/admin/utilisateurs').set(h.auth(admin)).send({
      role: 'LIVREUR', nom: 'A', prenom: 'B', email: `x.${h.unique()}@test.sn`,
      telephone: h.telephoneUnique(), motDePasse: h.MOT_DE_PASSE,
    });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.champ)).toContain('vehicule');
  });

  test('suspension : effet immédiat sur un jeton déjà émis, puis réactivation', async () => {
    const client = await h.inscrireEtConnecterClient();
    await h.api().get('/api/profil').set(h.auth(client)).expect(200);
    await h.api().patch(`/api/admin/utilisateurs/${client.id}/statut`).set(h.auth(admin)).send({ statut: 'INACTIF' }).expect(200);
    await h.api().get('/api/profil').set(h.auth(client)).expect(403);
    await h.api().post('/api/auth/connexion').send({ email: client.email, motDePasse: h.MOT_DE_PASSE }).expect(403);
    await h.api().patch(`/api/admin/utilisateurs/${client.id}/statut`).set(h.auth(admin)).send({ statut: 'ACTIF' }).expect(200);
    await h.api().get('/api/profil').set(h.auth(client)).expect(200);
  });

  test('un admin ne peut ni se suspendre ni se supprimer', async () => {
    await h.api().patch(`/api/admin/utilisateurs/${admin.id}/statut`).set(h.auth(admin)).send({ statut: 'INACTIF' }).expect(409);
    await h.api().delete(`/api/admin/utilisateurs/${admin.id}`).set(h.auth(admin)).expect(409);
  });

  test('suppression : possible sans historique, refusée (suspendre) si le client a des commandes', async () => {
    const sansHistorique = await h.inscrireEtConnecterClient();
    await h.api().delete(`/api/admin/utilisateurs/${sansHistorique.id}`).set(h.auth(admin)).expect(204);
    await h.api().get(`/api/admin/utilisateurs/${sansHistorique.id}`).set(h.auth(admin)).expect(404);

    const avecCommande = await h.inscrireEtConnecterClient();
    await h.api().post('/api/commandes').set(h.auth(avecCommande)).send(h.corpsCommande()).expect(201);
    const res = await h.api().delete(`/api/admin/utilisateurs/${avecCommande.id}`).set(h.auth(admin));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Suspendez-le/);
  });

  test('page Clients : nombre de commandes par client', async () => {
    const client = await h.inscrireEtConnecterClient();
    await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande()).expect(201);
    const res = await h.api().get('/api/admin/clients?limite=100').set(h.auth(admin)).expect(200);
    expect(res.body.donnees.find((c) => c.id === client.id).nombreCommandes).toBe(1);
  });

  test('identifiant mal formé : 400, pas d\'erreur serveur', async () => {
    await h.api().get('/api/admin/utilisateurs/pas-un-uuid').set(h.auth(admin)).expect(400);
    await h.api().get('/api/commandes/pas-un-uuid').set(h.auth(admin)).expect(400);
  });
});

describe('Tarification', () => {
  test('l\'admin modifie la grille : les nouvelles commandes utilisent les nouveaux paramètres', async () => {
    const admin = await h.creerAdmin();
    const client = await h.inscrireEtConnecterClient();
    const initiale = (await h.api().get('/api/tarification').set(h.auth(client)).expect(200)).body.parametres;

    await h.api().put('/api/admin/tarification').set(h.auth(client)).send(initiale).expect(403);
    await h.api().put('/api/admin/tarification').set(h.auth(admin))
      .send({ ...initiale, montantMinimum: 5000 }).expect(200);
    const res = await h.api().post('/api/commandes').set(h.auth(client))
      .send(h.corpsCommande(h.LIEUX.plateau, h.LIEUX.medina)).expect(201);
    expect(res.body.commande.montant).toBe(5000);

    await h.api().put('/api/admin/tarification').set(h.auth(admin)).send(initiale).expect(200);
  });
});
