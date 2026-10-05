const router = require('express').Router();
const ctrl = require('../controllers/authController');
const v = require('../validators/authValidators');
const valider = require('../middleware/valider');
const authentifier = require('../middleware/authentifier');
const { limiteurAuth } = require('../middleware/limiteur');
const { televerser } = require('../middleware/televersement');

// Pas de route d'inscription « administrateur » : ce rôle n'est jamais public.
router.post('/inscription/client', limiteurAuth, televerser.champs(['photo']), valider(v.inscriptionClient), ctrl.inscrireClient);
router.post('/inscription/livreur', limiteurAuth,
  televerser.champs(['photo', 'photoPermis', 'photoVehicule']), valider(v.inscriptionLivreur), ctrl.inscrireLivreur);
router.post('/connexion', limiteurAuth, valider(v.connexion), ctrl.connecter);
router.post('/deconnexion', authentifier, ctrl.deconnecter);
router.get('/moi', authentifier, ctrl.moi);
router.post('/mot-de-passe-oublie', limiteurAuth, valider(v.motDePasseOublie), ctrl.motDePasseOublie);
router.post('/reinitialiser-mot-de-passe', limiteurAuth, valider(v.reinitialisation), ctrl.reinitialiserMotDePasse);

module.exports = router;
