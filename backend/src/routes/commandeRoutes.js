const router = require('express').Router();
const ctrl = require('../controllers/commandeController');
const v = require('../validators/commandeValidators');
const valider = require('../middleware/valider');
const autoriser = require('../middleware/autoriser');

router.get('/', valider(v.lister), ctrl.lister);
router.post('/', autoriser('CLIENT'), valider(v.creer), ctrl.creer);
router.get('/:id', valider(v.id), ctrl.obtenir);
router.patch('/:id', autoriser('CLIENT'), valider(v.modifier), ctrl.modifier);

// Cycle de vie (les droits fins sont vérifiés par commandeService.ACTIONS)
router.post('/:id/valider', autoriser('ADMIN'), valider(v.id), ctrl.action('valider'));
router.post('/:id/affecter', autoriser('ADMIN'), valider(v.affecter), ctrl.action('affecter'));
router.post('/:id/accepter', autoriser('LIVREUR'), valider(v.id), ctrl.action('accepter'));
router.post('/:id/refuser', autoriser('LIVREUR'), valider(v.refuser), ctrl.action('refuser'));
router.post('/:id/demarrer', autoriser('LIVREUR'), valider(v.id), ctrl.action('demarrer'));
router.post('/:id/terminer', autoriser('LIVREUR'), valider(v.id), ctrl.action('terminer'));
router.post('/:id/confirmer', autoriser('CLIENT'), valider(v.confirmer), ctrl.action('confirmer'));
router.post('/:id/annuler', autoriser('CLIENT', 'ADMIN'), valider(v.annuler), ctrl.action('annuler'));

// Géolocalisation
router.post('/:id/positions', autoriser('LIVREUR'), valider(v.position), ctrl.envoyerPosition);
router.get('/:id/suivi', valider(v.id), ctrl.suivre);

module.exports = router;
