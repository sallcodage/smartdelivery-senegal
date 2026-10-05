const jwt = require('jsonwebtoken');
const h = require('../helpers');

afterAll(() => h.pool.end());

describe('Inscription', () => {
  test('un client crée son compte : enregistré en base, mot de passe haché, rôle CLIENT', async () => {
    const email = `awa.${h.unique()}@test.sn`;
    const t = h.telephoneUnique();
    const res = await h.api().post('/api/auth/inscription/client').send({
      nom: 'Ndiaye', prenom: 'Awa', email: email.toUpperCase(), telephone: `${t.slice(0, 2)} ${t.slice(2, 5)} ${t.slice(5, 7)} ${t.slice(7)}`, // espaces nettoyés
      motDePasse: h.MOT_DE_PASSE, confirmationMotDePasse: h.MOT_DE_PASSE, adresse: 'Sacré-Cœur 3, Dakar',
    });
    expect(res.status).toBe(201);
    expect(res.body.utilisateur).toMatchObject({ email, telephone: t, role: 'CLIENT', statutCompte: 'ACTIF', adresse: 'Sacré-Cœur 3, Dakar' });
    expect(JSON.stringify(res.body)).not.toMatch(/motDePasse|mot_de_passe|\$2b\$/);

    const { rows } = await h.pool.query(
      'SELECT u.mot_de_passe, c.adresse FROM utilisateurs u JOIN clients c ON c.id = u.id WHERE u.email = $1', [email]
    );
    expect(rows[0].mot_de_passe).toMatch(/^\$2b\$/);
    expect(rows[0].adresse).toBe('Sacré-Cœur 3, Dakar');
  });

  test('le champ « role » envoyé dans le formulaire est ignoré : impossible de devenir ADMIN', async () => {
    const email = `pirate.${h.unique()}@test.sn`;
    const res = await h.api().post('/api/auth/inscription/client').send({
      nom: 'X', prenom: 'Y', email, telephone: h.telephoneUnique(), motDePasse: h.MOT_DE_PASSE,
      confirmationMotDePasse: h.MOT_DE_PASSE, adresse: 'Dakar', role: 'ADMIN',
    });
    expect(res.status).toBe(201);
    expect(res.body.utilisateur.role).toBe('CLIENT');
    const { rows } = await h.pool.query('SELECT count(*) AS n FROM administrateurs a JOIN utilisateurs u ON u.id = a.id WHERE u.email = $1', [email]);
    expect(rows[0].n).toBe(0);
  });

  test('aucune route publique ne permet de créer un administrateur', async () => {
    const res = await h.api().post('/api/auth/inscription/admin').send({});
    expect(res.status).toBe(404);
  });

  test('e-mail déjà utilisé : 409 avec message clair', async () => {
    const client = await h.inscrireEtConnecterClient();
    const res = await h.api().post('/api/auth/inscription/client').send({
      nom: 'A', prenom: 'B', email: client.email, telephone: h.telephoneUnique(),
      motDePasse: h.MOT_DE_PASSE, confirmationMotDePasse: h.MOT_DE_PASSE, adresse: 'Dakar',
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Cette adresse e-mail est déjà utilisée');
  });

  test('mot de passe faible et confirmation différente : 400 avec détail par champ', async () => {
    const res = await h.api().post('/api/auth/inscription/client').send({
      nom: 'A', prenom: 'B', email: `x.${h.unique()}@test.sn`, telephone: h.telephoneUnique(),
      motDePasse: 'court', confirmationMotDePasse: 'autre', adresse: 'Dakar',
    });
    expect(res.status).toBe(400);
    const champs = res.body.details.map((d) => d.champ);
    expect(champs).toEqual(expect.arrayContaining(['motDePasse', 'confirmationMotDePasse']));
  });

  test('un livreur inscrit est EN_ATTENTE : connexion refusée tant qu\'un admin ne l\'a pas validé', async () => {
    const admin = await h.creerAdmin();
    const email = `livreur.${h.unique()}@test.sn`;
    const inscription = await h.envoyerInscriptionLivreur({
      nom: 'Fall', prenom: 'Ibrahima', email, telephone: h.telephoneUnique(), motDePasse: h.MOT_DE_PASSE,
      confirmationMotDePasse: h.MOT_DE_PASSE, vehicule: 'MOTO', numeroPermis: `P-${h.unique()}`,
    });
    expect(inscription.status).toBe(201);
    expect(inscription.body.utilisateur.statutCompte).toBe('EN_ATTENTE');

    const refus = await h.api().post('/api/auth/connexion').send({ email, motDePasse: h.MOT_DE_PASSE });
    expect(refus.status).toBe(403);
    expect(refus.body.message).toMatch(/attente de validation/);

    const notifs = await h.api().get('/api/notifications').set(h.auth(admin));
    expect(notifs.body.donnees.some((n) => n.message.includes('Ibrahima Fall'))).toBe(true);

    await h.api().patch(`/api/admin/utilisateurs/${inscription.body.utilisateur.id}/statut`)
      .set(h.auth(admin)).send({ statut: 'ACTIF' }).expect(200);
    const livreur = await h.connecter(email);
    expect(livreur.role).toBe('LIVREUR');
  });
});

describe('Connexion et JWT', () => {
  test('connexion : JWT signé + rôle issu de la base', async () => {
    const client = await h.inscrireEtConnecterClient();
    expect(client.role).toBe('CLIENT');
    const charge = jwt.decode(client.jeton);
    expect(charge).toMatchObject({ sub: client.id, role: 'CLIENT' });
    expect(charge.exp).toBeGreaterThan(charge.iat);
  });

  test('mauvais mot de passe et e-mail inconnu : même message 401 (pas de fuite d\'information)', async () => {
    const client = await h.inscrireEtConnecterClient();
    const a = await h.api().post('/api/auth/connexion').send({ email: client.email, motDePasse: 'Mauvais-123' });
    const b = await h.api().post('/api/auth/connexion').send({ email: 'inconnu@test.sn', motDePasse: 'Mauvais-123' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  test('/auth/moi : 401 sans jeton, 401 avec jeton falsifié, 200 avec jeton valide', async () => {
    const client = await h.inscrireEtConnecterClient();
    await h.api().get('/api/auth/moi').expect(401);
    const falsifie = jwt.sign({ sub: client.id, role: 'ADMIN' }, 'mauvais-secret-mauvais-secret-mauvais-secret');
    await h.api().get('/api/auth/moi').set({ Authorization: `Bearer ${falsifie}` }).expect(401);
    const res = await h.api().get('/api/auth/moi').set(h.auth(client)).expect(200);
    expect(res.body.utilisateur.email).toBe(client.email);
  });

  test('un jeton expiré est refusé', async () => {
    const client = await h.inscrireEtConnecterClient();
    const expire = jwt.sign({ sub: client.id, role: 'CLIENT', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);
    const res = await h.api().get('/api/auth/moi').set({ Authorization: `Bearer ${expire}` });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expirée/);
  });
});

describe('Mot de passe', () => {
  test('oubli puis réinitialisation : ancien mot de passe refusé, nouveau accepté, lien à usage unique', async () => {
    const client = await h.inscrireEtConnecterClient();
    const demande = await h.api().post('/api/auth/mot-de-passe-oublie').send({ email: client.email }).expect(200);
    const jeton = new URL(demande.body.lienReinitialisation).searchParams.get('jeton');

    const { rows } = await h.pool.query('SELECT token_hash FROM reinitialisations_mot_de_passe WHERE token_hash = $1', [jeton]);
    expect(rows).toHaveLength(0); // seul le hash SHA-256 est stocké

    const nouveau = 'Nouveau-2026';
    await h.api().post('/api/auth/reinitialiser-mot-de-passe')
      .send({ jeton, motDePasse: nouveau, confirmationMotDePasse: nouveau }).expect(200);
    await h.api().post('/api/auth/connexion').send({ email: client.email, motDePasse: h.MOT_DE_PASSE }).expect(401);
    await h.connecter(client.email, nouveau);
    await h.api().post('/api/auth/reinitialiser-mot-de-passe')
      .send({ jeton, motDePasse: nouveau, confirmationMotDePasse: nouveau }).expect(400);
  });

  test('e-mail inconnu : réponse identique, aucun lien', async () => {
    const res = await h.api().post('/api/auth/mot-de-passe-oublie').send({ email: 'personne@test.sn' }).expect(200);
    expect(res.body.lienReinitialisation).toBeUndefined();
  });

  test('changement depuis le profil : l\'ancien mot de passe est exigé', async () => {
    const client = await h.inscrireEtConnecterClient();
    await h.api().patch('/api/profil/mot-de-passe').set(h.auth(client))
      .send({ ancienMotDePasse: 'faux', nouveauMotDePasse: 'Autre-2026', confirmationMotDePasse: 'Autre-2026' })
      .expect(400);
    await h.api().patch('/api/profil/mot-de-passe').set(h.auth(client))
      .send({ ancienMotDePasse: h.MOT_DE_PASSE, nouveauMotDePasse: 'Autre-2026', confirmationMotDePasse: 'Autre-2026' })
      .expect(200);
    await h.connecter(client.email, 'Autre-2026');
  });
});

describe('Profil', () => {
  test('le client modifie ses informations autorisées, pas son e-mail ni son rôle', async () => {
    const client = await h.inscrireEtConnecterClient();
    const res = await h.api().patch('/api/profil').set(h.auth(client))
      .send({ prenom: 'Aïssatou', adresse: 'Mermoz, Dakar', email: 'autre@test.sn', role: 'ADMIN' }).expect(200);
    expect(res.body.utilisateur).toMatchObject({ prenom: 'Aïssatou', adresse: 'Mermoz, Dakar', email: client.email, role: 'CLIENT' });
  });
});
