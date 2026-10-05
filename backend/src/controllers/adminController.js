const utilisateurService = require('../services/utilisateurService');
const profilService = require('../services/profilService');
const livreurService = require('../services/livreurService');
const suiviService = require('../services/suiviService');
const tarifService = require('../services/tarifService');
const commandeService = require('../services/commandeService');
const kpiService = require('../services/kpiService');
const rapportService = require('../services/rapportService');

const filtresCommandes = (q) => ({ ...q, statuts: q.statut ? q.statut.split(',') : [] });

module.exports = {
  listerUtilisateurs: async (req, res) => res.json(await utilisateurService.lister(req.query)),
  obtenirUtilisateur: async (req, res) => res.json({ utilisateur: await profilService.obtenir(req.params.id) }),
  creerUtilisateur: async (req, res) => res.status(201).json({ utilisateur: await utilisateurService.creer(req.body) }),
  modifierUtilisateur: async (req, res) => res.json({ utilisateur: await utilisateurService.modifier(req.params.id, req.body) }),
  changerStatut: async (req, res) => res.json({
    utilisateur: await utilisateurService.changerStatut(req.params.id, req.body.statut, req.utilisateur),
  }),
  supprimerUtilisateur: async (req, res) => {
    await utilisateurService.supprimer(req.params.id, req.utilisateur);
    res.status(204).end();
  },
  listerClients: async (req, res) => res.json(await utilisateurService.listerClients(req.query)),
  listerLivreurs: async (req, res) => res.json({ livreurs: await livreurService.listerPourAdmin(req.query) }),
  livraisonsActives: async (req, res) => res.json({ livraisons: await suiviService.livraisonsActives() }),
  genererRapport: async (req, res) => res.status(201).json({ rapport: await rapportService.generer(req.body, req.utilisateur) }),
  listerRapports: async (req, res) => res.json(await rapportService.lister(req.query)),
  obtenirRapport: async (req, res) => res.json({ rapport: await rapportService.obtenir(req.params.id) }),
  pdfRapport: async (req, res) => {
    const { chemin, nom } = await rapportService.fichierPdf(req.params.id);
    const disposition = req.query.telecharger === '1' ? 'attachment' : 'inline';
    // Données sensibles (financières) : jamais conservées dans le cache du navigateur
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `${disposition}; filename="${nom}"`, 'Cache-Control': 'private, no-store' });
    res.sendFile(chemin, { etag: false, lastModified: false, cacheControl: false });
  },
  tableauDeBord: async (req, res) => res.json(await kpiService.tableauDeBord(req.query.periode || '30j')),
  compteursCommandes: async (req, res) => res.json(await commandeService.compteurs()),
  exporterCommandes: async (req, res) => {
    const csv = await commandeService.exporterCsv(req.utilisateur, filtresCommandes(req.query));
    const date = new Date().toISOString().slice(0, 10);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="commandes-smartdelivery-${date}.csv"` });
    res.send(csv);
  },
  performancesLivreur: async (req, res) => {
    await profilService.obtenir(req.params.id); // 404 si inconnu
    res.json({ performances: await livreurService.performances(req.params.id, req.query.periode || '30j') });
  },
  simulerTarification: async (req, res) => res.json({
    exemples: tarifService.simuler(req.body, [1, 3, 5, 10, 15, 20]),
  }),
  modifierTarification: async (req, res) => res.json({
    parametres: await tarifService.modifierParametres(req.body, req.utilisateur.id),
  }),
};
