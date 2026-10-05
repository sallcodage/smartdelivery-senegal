const router = require('express').Router();
const authentifier = require('../middleware/authentifier');
const autoriser = require('../middleware/autoriser');
const valider = require('../middleware/valider');
const reference = require('../controllers/referenceController');
const { estimation } = require('../validators/commandeValidators');
const { query } = require('../config/db');

router.get('/sante', async (req, res) => {
  await query('SELECT 1');
  res.json({ statut: 'ok', base: 'connectée' });
});

router.use('/auth', require('./authRoutes'));
router.use('/fichiers', require('./fichierRoutes'));
router.get('/zones', reference.zones);
router.get('/tarification', authentifier, reference.tarification);
router.post('/tarification/estimation', authentifier, valider(estimation), reference.estimer);

router.use('/profil', authentifier, require('./profilRoutes'));
router.use('/commandes', authentifier, require('./commandeRoutes'));
router.use('/notifications', authentifier, require('./notificationRoutes'));
router.use('/livreurs', authentifier, autoriser('LIVREUR'), require('./livreurRoutes'));
router.use('/assistant', authentifier, autoriser('CLIENT'), require('./assistantRoutes'));
router.use('/admin', authentifier, autoriser('ADMIN'), require('./adminRoutes'));

module.exports = router;
