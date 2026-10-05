const fs = require('fs');
const path = require('path');
const h = require('../helpers');

afterAll(() => h.pool.end());

const champsLivreur = (extra = {}) => ({
  nom: 'Sy', prenom: 'Mamadou', email: `sy.${h.unique()}@test.sn`, telephone: h.telephoneUnique(),
  motDePasse: h.MOT_DE_PASSE, confirmationMotDePasse: h.MOT_DE_PASSE, vehicule: 'MOTO', numeroPermis: `P-${h.unique()}`, ...extra,
});

describe('Photos et documents', () => {
  test('inscription client avec photo de profil : fichier enregistré et accessible publiquement', async () => {
    const t = h.telephoneUnique();
    const res = await h.api().post('/api/auth/inscription/client')
      .field('nom', 'Ba').field('prenom', 'Ousmane').field('email', `ba.${h.unique()}@test.sn`).field('telephone', t)
      .field('motDePasse', h.MOT_DE_PASSE).field('confirmationMotDePasse', h.MOT_DE_PASSE).field('adresse', 'Médina')
      .attach('photo', h.IMAGE_PNG, 'moi.png');
    expect(res.status).toBe(201);
    expect(res.body.utilisateur.photoUrl).toMatch(/^\/api\/fichiers\/profils\/[0-9a-f-]{36}\.png$/);
    const image = await h.api().get(res.body.utilisateur.photoUrl).expect(200);
    expect(image.headers['content-type']).toBe('image/png');
  });

  test('livreur : photo du permis obligatoire (sauf vélo)', async () => {
    const sansPermis = await h.envoyerInscriptionLivreur(champsLivreur(), {});
    expect(sansPermis.status).toBe(400);
    expect(sansPermis.body.details.map((d) => d.champ)).toContain('photoPermis');

    const velo = await h.envoyerInscriptionLivreur(champsLivreur({ vehicule: 'VELO', numeroPermis: '' }), {});
    expect(velo.status).toBe(201);
  });

  test('documents du livreur : visibles par l\'admin et le livreur, invisibles pour les autres et sans jeton', async () => {
    const admin = await h.creerAdmin();
    const champs = champsLivreur();
    const res = await h.envoyerInscriptionLivreur(champs, { photoPermis: h.IMAGE_PNG, photoVehicule: h.IMAGE_PNG });
    const url = res.body.utilisateur.photoPermisUrl;
    expect(url).toMatch(/^\/api\/fichiers\/documents\//);
    expect(res.body.utilisateur.photoVehiculeUrl).toBeTruthy();

    await h.api().get(url).expect(401);
    await h.api().get(url).set(h.auth(admin)).expect(200);
    const client = await h.inscrireEtConnecterClient();
    await h.api().get(url).set(h.auth(client)).expect(404);

    await h.api().patch(`/api/admin/utilisateurs/${res.body.utilisateur.id}/statut`).set(h.auth(admin)).send({ statut: 'ACTIF' });
    const livreur = await h.connecter(champs.email);
    await h.api().get(url).set(h.auth(livreur)).expect(200);
  });

  test('un faux fichier image (texte renommé en .png) est refusé et supprimé du disque', async () => {
    const dossier = path.join(__dirname, '..', 'uploads-temp', 'profils');
    const avant = fs.existsSync(dossier) ? fs.readdirSync(dossier).length : 0;
    const res = await h.api().post('/api/auth/inscription/client')
      .field('nom', 'X').field('prenom', 'Y').field('email', `x.${h.unique()}@test.sn`).field('telephone', h.telephoneUnique())
      .field('motDePasse', h.MOT_DE_PASSE).field('confirmationMotDePasse', h.MOT_DE_PASSE).field('adresse', 'Dakar')
      .attach('photo', Buffer.from('<script>alert(1)</script>'), { filename: 'piege.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    await new Promise((r) => setTimeout(r, 50));
    const apres = fs.existsSync(dossier) ? fs.readdirSync(dossier).length : 0;
    expect(apres).toBe(avant);
  });

  test('fichier trop volumineux (> 2 Mo) ou format non accepté : 400', async () => {
    const gros = Buffer.concat([h.IMAGE_PNG, Buffer.alloc(2 * 1024 * 1024 + 10)]);
    const client = await h.inscrireEtConnecterClient();
    const a = await h.api().put('/api/profil/photo').set(h.auth(client)).attach('photo', gros, 'gros.png');
    expect(a.status).toBe(400);
    expect(a.body.message).toMatch(/2 Mo/);
    const b = await h.api().put('/api/profil/photo').set(h.auth(client))
      .attach('photo', Buffer.from('GIF89a'), { filename: 'a.gif', contentType: 'image/gif' });
    expect(b.status).toBe(400);
  });

  test('changement de photo de profil : l\'ancienne est supprimée', async () => {
    const client = await h.inscrireEtConnecterClient();
    const premiere = (await h.api().put('/api/profil/photo').set(h.auth(client)).attach('photo', h.IMAGE_PNG, 'a.png').expect(200)).body.utilisateur.photoUrl;
    const seconde = (await h.api().put('/api/profil/photo').set(h.auth(client)).attach('photo', h.IMAGE_PNG, 'b.png').expect(200)).body.utilisateur.photoUrl;
    expect(seconde).not.toBe(premiere);
    await new Promise((r) => setTimeout(r, 50));
    await h.api().get(premiere).expect(404);
    await h.api().get(seconde).expect(200);
  });
});
