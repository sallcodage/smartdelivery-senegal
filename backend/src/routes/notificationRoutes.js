const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const v = require('../validators/notificationValidators');
const valider = require('../middleware/valider');

router.get('/', valider(v.lister), ctrl.lister);
router.patch('/lues', ctrl.marquerToutesLues);
router.patch('/:id/lue', valider(v.id), ctrl.marquerLue);

module.exports = router;
