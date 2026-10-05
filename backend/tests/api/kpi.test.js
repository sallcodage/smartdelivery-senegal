// Phase 12 : KPI. La base de test est partagée : on vérifie l'ÉCART avant/après un jeu d'actions connu.
const h = require('../helpers');

afterAll(() => h.pool.end());

const kpi = async (admin, periode = '30j') => (await h.api().get(`/api/admin/kpi?periode=${periode}`).set(h.auth(admin)).expect(200)).body;

describe('Tableau de bord et KPI', () => {
  test('indicateurs, répartitions, courbe et top livreurs reflètent les actions réelles', async () => {
    const admin = await h.creerAdmin();
    const client = await h.inscrireEtConnecterClient();
    const livreur = await h.creerLivreurActif(admin, { prenom: 'Babacar', nom: 'Mbengue' });
    await h.api().patch('/api/livreurs/moi/disponibilite').set(h.auth(livreur)).send({ disponibilite: true });
    const avant = await kpi(admin);

    const creer = (extra) => h.api().post('/api/commandes').set(h.auth(client)).send(h.corpsCommande(h.LIEUX.plateau, h.LIEUX.almadies, extra)).expect(201).then((r) => r.body.commande);
    // 1) livrée et confirmée (note 5) ; 2) annulée APRÈS validation ; 3) laissée en attente
    const livree = await creer({ typeColis: 'DOCUMENTS', zoneId: 3 });
    await h.api().post(`/api/commandes/${livree.id}/valider`).set(h.auth(admin)).expect(200);
    await h.api().post(`/api/commandes/${livree.id}/affecter`).set(h.auth(admin)).send({ livreurId: livreur.id }).expect(200);
    for (const a of ['accepter', 'demarrer', 'terminer']) await h.api().post(`/api/commandes/${livree.id}/${a}`).set(h.auth(livreur)).expect(200);
    await h.api().post(`/api/commandes/${livree.id}/confirmer`).set(h.auth(client)).send({ note: 5 }).expect(200);
    const annulee = await creer({ typeColis: 'NOURRITURE', zoneId: 3 });
    await h.api().post(`/api/commandes/${annulee.id}/valider`).set(h.auth(admin)).expect(200);
    await h.api().post(`/api/commandes/${annulee.id}/annuler`).set(h.auth(admin)).expect(200);
    await creer({ typeColis: 'DOCUMENTS', zoneId: 3 });

    const apres = await kpi(admin);
    const d = (cle) => apres.indicateurs[cle] - avant.indicateurs[cle];
    expect(d('totalCommandes')).toBe(3);
    expect(d('nouvelles')).toBe(1);
    expect(d('livrees')).toBe(1);
    expect(d('confirmees')).toBe(1);
    expect(d('annulees')).toBe(1);
    expect(d('annuleesApresValidation')).toBe(1);
    expect(d('chiffreAffaires')).toBe(livree.montant);
    expect(d('nombreNotes')).toBe(1);
    // Taux de réussite recalculé selon la définition validée
    const i = apres.indicateurs;
    expect(i.tauxReussite).toBe(Math.round((i.livrees / (i.livrees + i.annuleesApresValidation)) * 1000) / 10);
    expect(i.tempsLivraisonMinutes).not.toBeNull();
    expect(i.livreursDisponibles).toBeGreaterThanOrEqual(1);

    const n = (liste, cle, val) => liste.find((x) => x[cle] === val)?.n || 0;
    expect(n(apres.typesColis, 'type', 'DOCUMENTS') - n(avant.typesColis, 'type', 'DOCUMENTS')).toBe(2);
    expect(n(apres.zones, 'zone', 'Guédiawaye') - n(avant.zones, 'zone', 'Guédiawaye')).toBe(3);
    expect(apres.zones).toHaveLength(6); // toutes les zones, même sans commande
    expect(Math.round(apres.typesColis.reduce((t, x) => t + x.pourcentage, 0))).toBe(100);
    expect((apres.statuts.CONFIRMEE || 0) - (avant.statuts.CONFIRMEE || 0)).toBe(1);

    expect(apres.pas).toBe('day');
    expect(apres.evolution).toHaveLength(30);
    expect(apres.evolution.at(-1).commandes - avant.evolution.at(-1).commandes).toBe(3);
    expect(apres.evolution.at(-1).chiffreAffaires - avant.evolution.at(-1).chiffreAffaires).toBe(livree.montant);
    expect(apres.topLivreurs.map((l) => `${l.prenom} ${l.nom}`)).toContain('Babacar Mbengue');
  });

  test('périodes : regroupement par jour, semaine ou mois ; accès réservé à l\'admin', async () => {
    const admin = await h.creerAdmin();
    expect((await kpi(admin, '7j')).evolution).toHaveLength(7);
    const trimestre = await kpi(admin, '90j');
    expect(trimestre.pas).toBe('week');
    const annee = await kpi(admin, '12m');
    expect(annee.pas).toBe('month');
    expect(annee.evolution).toHaveLength(12);
    expect((await kpi(admin, 'tout')).indicateurs.totalCommandes).toBeGreaterThanOrEqual(annee.indicateurs.totalCommandes);
    await h.api().get('/api/admin/kpi?periode=2ans').set(h.auth(admin)).expect(400);
    const client = await h.inscrireEtConnecterClient();
    await h.api().get('/api/admin/kpi').set(h.auth(client)).expect(403);
  });
});
