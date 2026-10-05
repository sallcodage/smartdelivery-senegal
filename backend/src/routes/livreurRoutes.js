const router = require('express').Router();
const ctrl = require('../controllers/livreurController');
const v = require('../validators/livreurValidators');
const valider = require('../middleware/valider');

router.patch('/moi/disponibilite', valider(v.disponibilite), ctrl.disponibilite);
router.patch('/moi/position', valider(v.position), ctrl.position);
router.get('/moi/performances', valider(v.performances), ctrl.performances);

module.exports = router;
