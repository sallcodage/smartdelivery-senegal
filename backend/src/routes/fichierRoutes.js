const express = require('express');
const path = require('path');
const config = require('../config/app');
const authentifier = require('../middleware/authentifier');
const fichierService = require('../services/fichierService');

const router = express.Router();

// Photos de profil : publiques (noms aléatoires impossibles à deviner)
router.use('/profils', express.static(path.join(config.dossierUploads, 'profils'), {
  fallthrough: false, index: false, dotfiles: 'deny', maxAge: '1d',
}));

// Documents du livreur : authentification + contrôle du propriétaire
router.get('/documents/:nom', authentifier, async (req, res) => {
  res.sendFile(await fichierService.cheminDocument(req.params.nom, req.utilisateur));
});

module.exports = router;
