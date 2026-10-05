const profilService = require('../services/profilService');
const fichierService = require('../services/fichierService');
const { cheminRelatif } = require('../middleware/televersement');

async function obtenir(req, res) {
  res.json({ utilisateur: await profilService.obtenir(req.utilisateur.id) });
}
async function modifier(req, res) {
  res.json({ utilisateur: await profilService.modifier(req.utilisateur, req.body) });
}
async function changerMotDePasse(req, res) {
  await profilService.changerMotDePasse(req.utilisateur.id, req.body.ancienMotDePasse, req.body.nouveauMotDePasse);
  res.json({ message: 'Mot de passe modifié' });
}

async function changerPhoto(req, res) {
  await fichierService.remplacerPhotoProfil(req.utilisateur.id, cheminRelatif(req.file));
  res.json({ utilisateur: await profilService.obtenir(req.utilisateur.id) });
}

module.exports = { obtenir, modifier, changerMotDePasse, changerPhoto };
