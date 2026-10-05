// Phase 11 : chaque étape du cycle notifie le bon destinataire, une seule fois, avec le bon message.
const h = require('../helpers');

afterAll(() => h.pool.end());

const messagesDe = async (u, commandeId) => (await h.api().get('/api/notifications?limite=100').set(h.auth(u)).expect(200))
  .body.donnees.filter((n) => n.commandeId === commandeId).map((n) => n.message).reverse(); // ordre chronologique

describe('Notifications du cycle complet', () => {
  test('client, livreur et admin reçoivent exactement les notifications prévues', async () => {
    const admin = await h.creerAdmin();
    const client = await h.inscrireEtConnecterClient({ prenom: 'Rokhaya', nom: 'Ndour' });
    const livreur = await h.creerLivreurActif(admin, { prenom: 'Pape', nom: 'Diouf' });
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true });

    const c = (await h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande()).expect(201)).body.commande;
    const etapes = [
      [admin, 'valider'], [admin, 'affecter', { livreurId: livreur.id }], [livreur, 'accepter'],
      [livreur, 'demarrer'], [livreur, 'terminer'], [client, 'confirmer', { note: 4 }],
    ];
    for (const [acteur, action, corps] of etapes) {
      await h.api().post(`/api/commandes/${c.id}/${action}`).set(h.auth(acteur)).send(corps || {}).expect(200);
    }

    const pourClient = await messagesDe(client, c.id);
    expect(pourClient).toHaveLength(6);
    expect(pourClient[0]).toMatch(new RegExp(`Votre commande ${c.numero} a été enregistrée \\(\\d[\\d ]* FCFA\\)`));
    expect(pourClient[1]).toMatch(/a été validée/);
    expect(pourClient[2]).toMatch(/Le livreur Pape Diouf a été affecté/);
    expect(pourClient[3]).toMatch(/Pape Diouf a accepté votre commande/);
    expect(pourClient[4]).toMatch(/est en route/);
    expect(pourClient[5]).toMatch(/a été livrée. Merci de confirmer/);

    const pourLivreur = await messagesDe(livreur, c.id);
    expect(pourLivreur).toEqual([
      `La livraison ${c.numero} vous a été affectée. Acceptez-la ou refusez-la.`,
      `Le client a confirmé la réception de ${c.numero}. Note attribuée : 4/5.`,
    ]);

    const pourAdmin = await messagesDe(admin, c.id);
    expect(pourAdmin).toEqual([
      `Nouvelle commande ${c.numero} de Rokhaya Ndour à valider.`,
      `Pape Diouf a accepté la livraison ${c.numero}.`,
      `La livraison ${c.numero} a été effectuée par Pape Diouf.`,
      `La commande ${c.numero} est terminée (réception confirmée).`,
    ]);

    // Aucun doublon, aucune notification destinée à quelqu'un d'autre
    for (const liste of [pourClient, pourLivreur, pourAdmin]) expect(new Set(liste).size).toBe(liste.length);
    expect(pourLivreur.some((m) => m.includes('Votre commande'))).toBe(false);
  });

  test('chacun ne voit et ne modifie que ses propres notifications', async () => {
    const a = await h.inscrireEtConnecterClient();
    const b = await h.inscrireEtConnecterClient();
    await h.api().post('/api/commandes').set(h.auth(a)).send(h.corpsCommande()).expect(201);
    const notifA = (await h.api().get('/api/notifications').set(h.auth(a))).body.donnees[0];
    expect((await h.api().get('/api/notifications').set(h.auth(b))).body.donnees.find((n) => n.id === notifA.id)).toBeUndefined();
    await h.api().patch(`/api/notifications/${notifA.id}/lue`).set(h.auth(b)).expect(404);
    const nonLues = (await h.api().get('/api/notifications').set(h.auth(a))).body.nonLues;
    await h.api().patch(`/api/notifications/${notifA.id}/lue`).set(h.auth(a)).expect(200);
    expect((await h.api().get('/api/notifications').set(h.auth(a))).body.nonLues).toBe(nonLues - 1);
  });
});
