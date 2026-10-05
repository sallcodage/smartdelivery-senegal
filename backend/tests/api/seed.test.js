// Seed de démonstration : cohérence avec le schéma, réexécution contrôlée, vraies données préservées.
const h = require('../helpers');
const seed = require('../../scripts/seed-demo');

const silencieux = () => {};
afterAll(async () => { await seed.supprimerDemo(silencieux).catch(() => {}); await h.pool.end(); });

describe('Seed de démonstration', () => {
  test('crée un jeu cohérent, refuse une 2e exécution, remplace sans toucher aux vraies données', async () => {
    process.env.DEMO_MOT_DE_PASSE = 'Seed-Test-2026';
    if (await seed.compterDemo()) await seed.supprimerDemo(silencieux);
    const reelle = await h.inscrireEtConnecterClient();
    const vraie = (await h.api().post('/api/commandes').set(h.auth(reelle)).send(h.corpsCommande()).expect(201)).body.commande;

    const { comptes } = await seed.executerSeed({ commandes: 60, jours: 20, clients: 12, livreurs: 10 }, silencieux);
    const q = async (sql, p = []) => (await h.pool.query(sql, p)).rows[0];
    const demo = `SELECT id FROM utilisateurs WHERE email LIKE '%@${seed.DOMAINE_DEMO}'`;

    // Volumes et cycle complet
    const n = await q(`SELECT
      (SELECT count(*) FROM commandes WHERE client_id IN (${demo})) AS commandes,
      (SELECT count(*) FROM commandes WHERE client_id IN (${demo}) AND statut = 'CONFIRMEE') AS confirmees,
      (SELECT count(*) FROM positions_gps p JOIN livraisons l ON l.id = p.livraison_id JOIN commandes c ON c.id = l.commande_id WHERE c.client_id IN (${demo})) AS positions,
      (SELECT count(*) FROM conversations_ia WHERE client_id IN (${demo})) AS conversations,
      (SELECT count(*) FROM rapports WHERE administrateur_id IN (${demo})) AS rapports`);
    expect(n.commandes).toBeGreaterThan(60);
    expect(n.confirmees).toBeGreaterThan(30);
    expect(n.positions).toBeGreaterThan(200);
    expect(n.conversations).toBeGreaterThan(0);
    expect(n.rapports).toBe(3);

    // Cohérence temporelle et métier
    const incoherences = await q(`SELECT
      (SELECT count(*) FROM commandes WHERE date_creation > now()) +
      (SELECT count(*) FROM (SELECT date_changement < lag(date_changement) OVER (PARTITION BY commande_id ORDER BY id) AS d FROM historique_statuts) x WHERE d) +
      (SELECT count(*) FROM positions_gps p JOIN livraisons l ON l.id = p.livraison_id WHERE p.date_heure < l.date_debut - interval '1 second' OR p.date_heure > coalesce(l.date_fin, now()) + interval '1 second') +
      (SELECT count(*) FROM commandes c JOIN livraisons l ON l.commande_id = c.id WHERE c.statut = 'CONFIRMEE' AND l.note_client IS NULL) AS total`);
    expect(incoherences.total).toBe(0);

    // Comptes de démonstration utilisables pour le parcours complet
    for (const email of [`admin.demo@${seed.DOMAINE_DEMO}`, `client.demo@${seed.DOMAINE_DEMO}`, `livreur.demo@${seed.DOMAINE_DEMO}`]) {
      await h.api().post('/api/auth/connexion').send({ email, motDePasse: 'Seed-Test-2026' }).expect(200);
    }
    // Comptes figurants : aucune connexion possible
    const figurant = comptes.clients[1].email;
    await h.api().post('/api/auth/connexion').send({ email: figurant, motDePasse: 'Seed-Test-2026' }).expect(401);

    // Réexécution contrôlée
    await expect(seed.executerSeed({ commandes: 10, jours: 5 }, silencieux)).rejects.toThrow(/existent déjà/);
    await seed.executerSeed({ commandes: 30, jours: 10, clients: 8, livreurs: 8, remplacer: true }, silencieux);
    expect((await q('SELECT count(*) AS n FROM commandes WHERE id = $1', [vraie.id])).n).toBe(1);
    expect((await q(`SELECT count(*) AS n FROM utilisateurs WHERE email = $1`, [reelle.email])).n).toBe(1);
  }, 180000);
});
