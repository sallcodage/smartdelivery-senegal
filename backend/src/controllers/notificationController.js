const notificationService = require('../services/notificationService');

async function lister(req, res) {
  res.json(await notificationService.lister(req.utilisateur.id, req.query));
}
async function marquerLue(req, res) {
  res.json({ notification: await notificationService.marquerLue(req.params.id, req.utilisateur.id) });
}
async function marquerToutesLues(req, res) {
  res.json(await notificationService.marquerToutesLues(req.utilisateur.id));
}

module.exports = { lister, marquerLue, marquerToutesLues };
