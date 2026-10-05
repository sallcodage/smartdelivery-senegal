const router = require('express').Router();
const ctrl = require('../controllers/profilController');
const v = require('../validators/profilValidators');
const valider = require('../middleware/valider');
const { televerser } = require('../middleware/televersement');

router.get('/', ctrl.obtenir);
router.patch('/', valider(v.modifier), ctrl.modifier);
router.put('/photo', televerser.unique('photo'), ctrl.changerPhoto);
router.patch('/mot-de-passe', valider(v.motDePasse), ctrl.changerMotDePasse);

module.exports = router;
