const livreurService = require('../services/livreurService');

async function disponibilite(req, res) {
  res.json(await livreurService.modifierDisponibilite(req.utilisateur.id, req.body.disponibilite));
}
async function position(req, res) {
  res.json({ position: await livreurService.mettreAJourPosition(req.utilisateur.id, req.body) });
}

async function performances(req, res) {
  res.json({ performances: await livreurService.performances(req.utilisateur.id, req.query.periode || '30j') });
}

module.exports = { disponibilite, position, performances };
