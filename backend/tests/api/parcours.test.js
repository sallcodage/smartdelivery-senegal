// Parcours complet (cahier de tests, point 24) :
// Client commande → Admin valide et affecte → Livreur accepte, démarre, envoie sa position
// → Client suit → Livreur termine → Client confirme → CONFIRMEE.
const h = require('../helpers');

afterAll(() => h.pool.end());

// Formule attendue avec les paramètres initiaux (500 FCFA + 150 FCFA/km, min 1 000, arrondi 50)
const montantAttendu = (km) => Math.max(1000, Math.ceil((500 + km * 150) / 50) * 50);
let estimation;

const notificationsDe = async (u) => (await h.api().get('/api/notifications?limite=100').set(h.auth(u))).body;

describe('Parcours complet d\'une commande', () => {
  let admin; let client; let autreClient; let livreur; let livreur2; let commande;

  beforeAll(async () => {
    admin = await h.creerAdmin();
    client = await h.inscrireEtConnecterClient();
    autreClient = await h.inscrireEtConnecterClient({ prenom: 'Fatou', nom: 'Sow' });
    livreur = await h.creerLivreurActif(admin, { prenom: 'Moussa', nom: 'Diop' });
    livreur2 = await h.creerLivreurActif(admin, { prenom: 'Cheikh', nom: 'Sarr' });
  });

  test('1. estimation : prix calculé par le backend selon la distance', async () => {
    const res = await h.api().post('/api/tarification/estimation').set(h.auth(client))
      .send(h.corpsCommande()).expect(200);
    estimation = res.body.estimation;
    expect(estimation.distanceKm).toBeGreaterThan(11); // Plateau → Almadies ≈ 11,8 km à vol d'oiseau
    expect(estimation.distanceKm).toBeLessThan(12.5);
    expect(estimation.montant).toBe(montantAttendu(estimation.distanceKm));
  });

  test('2. le client crée une commande : montant envoyé ignoré, statut NOUVELLE', async () => {
    const res = await h.api().post('/api/commandes').set(h.auth(client))
      .send(h.corpsCommande(h.LIEUX.plateau, h.LIEUX.almadies, { montant: 1, statut: 'LIVREE' })).expect(201);
    commande = res.body.commande;
    expect(commande).toMatchObject({
      statut: 'NOUVELLE', libelleStatut: 'En attente', montant: estimation.montant, zone: { nom: 'Dakar' },
    });
    expect(commande.numero).toMatch(/^CMD-\d{6}$/);
    expect(commande.historique).toHaveLength(1);
  });

  test('3. l\'admin voit la nouvelle commande et est notifié', async () => {
    const liste = await h.api().get('/api/commandes?statut=NOUVELLE').set(h.auth(admin)).expect(200);
    expect(liste.body.donnees.map((c) => c.id)).toContain(commande.id);
    const notifs = await notificationsDe(admin);
    expect(notifs.donnees.some((n) => n.message.includes(commande.numero) && n.statut === 'NON_LUE')).toBe(true);
  });

  test('4. cloisonnement : un autre client ne voit pas la commande, un client ne peut pas valider', async () => {
    await h.api().get(`/api/commandes/${commande.id}`).set(h.auth(autreClient)).expect(404);
    const listeAutre = await h.api().get('/api/commandes').set(h.auth(autreClient)).expect(200);
    expect(listeAutre.body.donnees).toHaveLength(0);
    await h.api().post(`/api/commandes/${commande.id}/valider`).set(h.auth(client)).expect(403);
    await h.api().get('/api/admin/utilisateurs').set(h.auth(client)).expect(403);
    await h.api().get('/api/admin/utilisateurs').set(h.auth(livreur)).expect(403);
  });

  test('5. transitions illégales refusées par le backend', async () => {
    const affecter = await h.api().post(`/api/commandes/${commande.id}/affecter`).set(h.auth(admin))
      .send({ livreurId: livreur.id });
    expect(affecter.status).toBe(409);
    expect(affecter.body.message).toMatch(/En attente/);
    await h.api().post(`/api/commandes/${commande.id}/confirmer`).set(h.auth(client)).expect(409);
  });

  test('6. le client peut modifier sa commande tant qu\'elle est NOUVELLE (prix recalculé)', async () => {
    const res = await h.api().patch(`/api/commandes/${commande.id}`).set(h.auth(client))
      .send({ ...h.corpsCommande(h.LIEUX.plateau, h.LIEUX.ouakam), montant: 99 }).expect(200);
    expect(res.body.commande.arrivee.adresse).toBe('Ouakam');
    expect(res.body.commande.montant).toBeLessThan(estimation.montant);
    await h.api().patch(`/api/commandes/${commande.id}`).set(h.auth(client))
      .send(h.corpsCommande(h.LIEUX.plateau, h.LIEUX.almadies)).expect(200);
  });

  test('7. l\'admin valide : le client est notifié, la modification devient impossible', async () => {
    const res = await h.api().post(`/api/commandes/${commande.id}/valider`).set(h.auth(admin)).expect(200);
    expect(res.body.commande.statut).toBe('VALIDEE');
    expect((await notificationsDe(client)).donnees.some((n) => n.message.includes('a été validée'))).toBe(true);
    await h.api().patch(`/api/commandes/${commande.id}`).set(h.auth(client)).send({ poidsKg: 3 }).expect(409);
    await h.api().post(`/api/commandes/${commande.id}/annuler`).set(h.auth(client)).expect(409);
  });

  test('8. affectation refusée si le livreur est indisponible', async () => {
    const res = await h.api().post(`/api/commandes/${commande.id}/affecter`).set(h.auth(admin))
      .send({ livreurId: livreur.id });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/pas disponible/);
  });

  test('9. le livreur se déclare disponible, l\'admin le voit dans la liste et l\'affecte', async () => {
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true }).expect(200);
    const dispo = await h.api().get('/api/admin/livreurs?disponible=true').set(h.auth(admin)).expect(200);
    expect(dispo.body.livreurs.map((l) => l.id)).toContain(livreur.id);

    const res = await h.api().post(`/api/commandes/${commande.id}/affecter`).set(h.auth(admin))
      .send({ livreurId: livreur.id }).expect(200);
    expect(res.body.commande.statut).toBe('LIVREUR_AFFECTE');
    expect(res.body.commande.livraison.livreur.nom).toBe('Moussa Diop');
    expect(res.body.commande.livraison.montantLivreur).toBe(Math.round(estimation.montant * 0.8)); // part livreur 80 %
  });

  test('10. le livreur refuse avec un motif : retour à VALIDEE, admin notifié, commande invisible pour lui', async () => {
    await h.api().post(`/api/commandes/${commande.id}/accepter`).set(h.auth(livreur2)).expect(404);
    await h.api().post(`/api/commandes/${commande.id}/refuser`).set(h.auth(livreur)).send({}).expect(400);
    await h.api().post(`/api/commandes/${commande.id}/refuser`).set(h.auth(livreur))
      .send({ motif: 'Panne de moto' }).expect(200);
    await h.api().get(`/api/commandes/${commande.id}`).set(h.auth(livreur)).expect(404);
    const detail = await h.api().get(`/api/commandes/${commande.id}`).set(h.auth(admin)).expect(200);
    expect(detail.body.commande.statut).toBe('VALIDEE');
    expect(detail.body.commande.historique.at(-1)).toMatchObject({ motif: 'Panne de moto', auteur: 'Moussa Diop' });
    expect((await notificationsDe(admin)).donnees.some((n) => n.message.includes('Panne de moto'))).toBe(true);
  });

  test('11. affectation automatique : livreur disponible le plus proche, hors livreur ayant refusé', async () => {
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur2)).send({ disponibilite: true }).expect(200);
    // livreur (qui a refusé) est tout près du départ ; livreur2 est à Pikine
    await h.api().patch('/api/livreurs/moi/position').set(h.auth(livreur)).send(h.LIEUX.plateau).expect(200);
    await h.api().patch('/api/livreurs/moi/position').set(h.auth(livreur2)).send(h.LIEUX.pikine).expect(200);
    const res = await h.api().post(`/api/commandes/${commande.id}/affecter`).set(h.auth(admin))
      .send({ automatique: true }).expect(200);
    expect(res.body.commande.livraison.livreur.id).toBe(livreur2.id);
  });

  test('12. le livreur voit sa livraison affectée et l\'accepte ; le client est notifié', async () => {
    const liste = await h.api().get('/api/commandes').set(h.auth(livreur2)).expect(200);
    expect(liste.body.donnees.map((c) => c.id)).toEqual([commande.id]);
    const res = await h.api().post(`/api/commandes/${commande.id}/accepter`).set(h.auth(livreur2)).expect(200);
    expect(res.body.commande.statut).toBe('ACCEPTEE');
    expect((await notificationsDe(client)).donnees.some((n) => n.message.includes('Cheikh Sarr a accepté'))).toBe(true);
  });

  test('13. GPS refusé avant le démarrage, accepté après', async () => {
    await h.api().post(`/api/commandes/${commande.id}/positions`).set(h.auth(livreur2)).send(h.LIEUX.plateau).expect(409);
    const res = await h.api().post(`/api/commandes/${commande.id}/demarrer`).set(h.auth(livreur2)).expect(200);
    expect(res.body.commande.livraison.dateDebut).toBeTruthy();

    const trajet = [h.LIEUX.plateau, h.LIEUX.medina, h.LIEUX.ouakam];
    for (const point of trajet) {
      const p = await h.api().post(`/api/commandes/${commande.id}/positions`).set(h.auth(livreur2))
        .send({ latitude: point.latitude, longitude: point.longitude }).expect(201);
      expect(p.body.position.distanceRestanteKm).toBeGreaterThan(0);
    }
    await h.api().post(`/api/commandes/${commande.id}/positions`).set(h.auth(livreur))
      .send({ latitude: 14.7, longitude: -17.4 }).expect(404);
  });

  test('14. le client suit la livraison sur la carte ; l\'admin la voit dans les livraisons actives', async () => {
    const suivi = await h.api().get(`/api/commandes/${commande.id}/suivi`).set(h.auth(client)).expect(200);
    expect(suivi.body.positions).toHaveLength(3);
    expect(suivi.body.dernierePosition).toMatchObject({ latitude: h.LIEUX.ouakam.latitude });
    expect(suivi.body.distanceRestanteKm).toBeGreaterThan(2);
    expect(suivi.body.commande.livraison.montantLivreur).toBeUndefined(); // info interne masquée au client
    await h.api().get(`/api/commandes/${commande.id}/suivi`).set(h.auth(autreClient)).expect(404);

    const actives = await h.api().get('/api/admin/livraisons/actives').set(h.auth(admin)).expect(200);
    const ligne = actives.body.livraisons.find((l) => l.id === commande.id);
    expect(ligne.dernierePosition).not.toBeNull();
  });

  test('15. suspension impossible pendant une livraison en cours', async () => {
    const res = await h.api().patch(`/api/admin/utilisateurs/${livreur2.id}/statut`).set(h.auth(admin))
      .send({ statut: 'INACTIF' });
    expect(res.status).toBe(409);
  });

  test('16. le livreur termine : distance parcourue calculée depuis le GPS', async () => {
    const res = await h.api().post(`/api/commandes/${commande.id}/terminer`).set(h.auth(livreur2)).expect(200);
    expect(res.body.commande.statut).toBe('LIVREE');
    expect(res.body.commande.livraison.distanceParcourueKm).toBeGreaterThan(5);
    expect(res.body.commande.livraison.dateFin).toBeTruthy();
    expect((await notificationsDe(client)).donnees.some((n) => n.message.includes('confirmer sa réception'))).toBe(true);
  });

  test('17. le client confirme la réception et note le livreur : CONFIRMEE', async () => {
    await h.api().post(`/api/commandes/${commande.id}/confirmer`).set(h.auth(client)).send({ note: 9 }).expect(400);
    const res = await h.api().post(`/api/commandes/${commande.id}/confirmer`).set(h.auth(client))
      .send({ note: 5 }).expect(200);
    expect(res.body.commande).toMatchObject({ statut: 'CONFIRMEE', libelleStatut: 'Terminée' });
    expect(res.body.commande.livraison.noteClient).toBe(5);

    const livreurs = await h.api().get('/api/admin/livreurs').set(h.auth(admin));
    const l2 = livreurs.body.livreurs.find((l) => l.id === livreur2.id);
    expect(l2).toMatchObject({ noteMoyenne: 5, nombreEvaluations: 1, livraisonsEffectuees: 1, etat: 'DISPONIBLE' });
    expect((await notificationsDe(livreur2)).donnees.some((n) => n.message.includes('Note attribuée : 5/5'))).toBe(true);
  });

  test('18. état final : historique complet et plus aucune action possible', async () => {
    const detail = await h.api().get(`/api/commandes/${commande.id}`).set(h.auth(admin)).expect(200);
    expect(detail.body.commande.historique.map((e) => e.nouveauStatut)).toEqual([
      'NOUVELLE', 'VALIDEE', 'LIVREUR_AFFECTE', 'VALIDEE', 'LIVREUR_AFFECTE',
      'ACCEPTEE', 'EN_COURS', 'LIVREE', 'CONFIRMEE',
    ]);
    await h.api().post(`/api/commandes/${commande.id}/annuler`).set(h.auth(admin)).expect(409);
  });

  test('19. notifications : lecture individuelle puis globale', async () => {
    const avant = await notificationsDe(client);
    expect(avant.nonLues).toBeGreaterThan(0);
    await h.api().patch(`/api/notifications/${avant.donnees[0].id}/lue`).set(h.auth(client)).expect(200);
    await h.api().patch(`/api/notifications/${avant.donnees[0].id}/lue`).set(h.auth(autreClient)).expect(404);
    await h.api().patch('/api/notifications/lues').set(h.auth(client)).expect(200);
    expect((await notificationsDe(client)).nonLues).toBe(0);
  });
});

describe('Annulation', () => {
  test('le client annule une commande NOUVELLE ; l\'admin annule une commande affectée et le livreur est prévenu', async () => {
    const admin = await h.creerAdmin();
    const client = await h.inscrireEtConnecterClient();
    const livreur = await h.creerLivreurActif(admin);
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true });

    const c1 = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande())).body.commande;
    const a1 = await h.api().post(`/api/commandes/${c1.id}/annuler`).set(h.auth(client)).expect(200);
    expect(a1.body.commande.statut).toBe('ANNULEE');

    const c2 = (await h.api().post('/api/commandes').set(h.auth(client))
      .send(h.corpsCommande(h.LIEUX.medina, h.LIEUX.pikine))).body.commande;
    await h.api().post(`/api/commandes/${c2.id}/valider`).set(h.auth(admin)).expect(200);
    await h.api().post(`/api/commandes/${c2.id}/affecter`).set(h.auth(admin)).send({ livreurId: livreur.id }).expect(200);
    await h.api().post(`/api/commandes/${c2.id}/annuler`).set(h.auth(admin)).send({ motif: 'Adresse erronée' }).expect(200);
    const notifs = (await h.api().get('/api/notifications').set(h.auth(livreur))).body.donnees;
    expect(notifs.some((n) => n.message.includes(`${c2.numero} a été annulée`))).toBe(true);
  });
});
