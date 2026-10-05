const h = require('../helpers');

afterAll(() => h.pool.end());

async function commandeAffectee(admin, client, livreur) {
  const c = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande()).expect(201)).body.commande;
  await h.api().post(`/api/commandes/${c.id}/valider`).set(h.auth(admin)).expect(200);
  await h.api().post(`/api/commandes/${c.id}/affecter`).set(h.auth(admin)).send({ livreurId: livreur.id }).expect(200);
  return c;
}

describe('Performances du livreur', () => {
  test('calculées sur les données réelles : livraisons, refus, taux d\'acceptation, gains, distance, courbe', async () => {
    const admin = await h.creerAdmin();
    const client = await h.inscrireEtConnecterClient();
    const livreur = await h.creerLivreurActif(admin);
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true }).expect(200);

    const vide = (await h.api().get('/api/livreurs/moi/performances').set(h.auth(livreur)).expect(200)).body.performances;
    expect(vide).toMatchObject({ livraisonsEffectuees: 0, gains: 0, tauxAcceptation: null, tempsMoyenMinutes: null });
    expect(vide.parJour).toHaveLength(30);

    // 1re commande : refusée
    const refusee = await commandeAffectee(admin, client, livreur);
    await h.api().post(`/api/commandes/${refusee.id}/refuser`).set(h.auth(livreur)).send({ motif: 'Trop loin' }).expect(200);

    // 2e commande : livrée avec un trajet GPS, puis confirmée avec une note
    const livree = await commandeAffectee(admin, client, livreur);
    for (const action of ['accepter', 'demarrer']) {
      await h.api().post(`/api/commandes/${livree.id}/${action}`).set(h.auth(livreur)).expect(200);
    }
    for (const lieu of [h.LIEUX.plateau, h.LIEUX.medina, h.LIEUX.ouakam, h.LIEUX.almadies]) {
      await h.api().post(`/api/commandes/${livree.id}/positions`).set(h.auth(livreur)).send({ latitude: lieu.latitude, longitude: lieu.longitude }).expect(201);
    }
    const fin = (await h.api().post(`/api/commandes/${livree.id}/terminer`).set(h.auth(livreur)).expect(200)).body.commande;
    await h.api().post(`/api/commandes/${livree.id}/confirmer`).set(h.auth(client)).send({ note: 5 }).expect(200);

    const p = (await h.api().get('/api/livreurs/moi/performances?periode=7j').set(h.auth(livreur)).expect(200)).body.performances;
    expect(p).toMatchObject({
      periode: '7j', livraisonsEffectuees: 1, acceptees: 1, refusees: 1, tauxAcceptation: 50,
      gains: fin.livraison.montantLivreur, distanceKm: fin.livraison.distanceParcourueKm,
      notePeriode: 5, noteMoyenne: 5, livraisonsActives: 0,
    });
    expect(p.tempsMoyenMinutes).toBe(0); // démarrage et fin dans la même seconde pendant le test
    expect(p.parJour).toHaveLength(7);
    expect(p.parJour.at(-1)).toMatchObject({ livraisons: 1, gains: fin.livraison.montantLivreur });
  });

  test('réservé au livreur ; période invalide refusée', async () => {
    const client = await h.inscrireEtConnecterClient();
    await h.api().get('/api/livreurs/moi/performances').set(h.auth(client)).expect(403);
    const admin = await h.creerAdmin();
    const livreur = await h.creerLivreurActif(admin);
    await h.api().get('/api/livreurs/moi/performances?periode=an').set(h.auth(livreur)).expect(400);
  });
});
