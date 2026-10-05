const zoneService = require('../services/zoneService');
const tarifService = require('../services/tarifService');

async function zones(req, res) {
  res.json({ zones: await zoneService.lister() });
}
async function tarification(req, res) {
  res.json({ parametres: await tarifService.obtenirParametres() });
}
async function estimer(req, res) {
  res.json({ estimation: await tarifService.estimer(req.body) });
}

module.exports = { zones, tarification, estimer };
