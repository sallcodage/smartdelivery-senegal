const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const v = require('../validators/adminValidators');
const vc = require('../validators/commandeValidators');
const vl = require('../validators/livreurValidators');
const valider = require('../middleware/valider');

router.get('/utilisateurs', valider(v.listerUtilisateurs), ctrl.listerUtilisateurs);
router.post('/utilisateurs', valider(v.creerUtilisateur), ctrl.creerUtilisateur);
router.get('/utilisateurs/:id', valider(v.id), ctrl.obtenirUtilisateur);
router.patch('/utilisateurs/:id', valider(v.modifierUtilisateur), ctrl.modifierUtilisateur);
router.patch('/utilisateurs/:id/statut', valider(v.statut), ctrl.changerStatut);
router.delete('/utilisateurs/:id', valider(v.id), ctrl.supprimerUtilisateur);

router.get('/clients', ctrl.listerClients);
router.get('/livreurs', valider(v.listerLivreurs), ctrl.listerLivreurs);
router.get('/livreurs/:id/performances', valider([...v.id, ...vl.performances]), ctrl.performancesLivreur);
router.get('/livraisons/actives', ctrl.livraisonsActives);
router.post('/tarification/simulation', valider(v.simulation), ctrl.simulerTarification);
router.get('/kpi', valider(v.kpi), ctrl.tableauDeBord);
router.post('/rapports', valider(v.genererRapport), ctrl.genererRapport);
router.get('/rapports', valider(v.listerRapports), ctrl.listerRapports);
router.get('/rapports/:id', valider(v.id), ctrl.obtenirRapport);
router.get('/rapports/:id/pdf', valider(v.id), ctrl.pdfRapport);
router.get('/commandes/compteurs', ctrl.compteursCommandes);
router.get('/commandes/export', valider(vc.lister), ctrl.exporterCommandes);
router.put('/tarification', valider(v.tarification), ctrl.modifierTarification);

module.exports = router;
