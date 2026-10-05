const assistantService = require('../services/assistantService');

module.exports = {
  poser: async (req, res) => res.status(201).json(await assistantService.poserQuestion(req.utilisateur, req.body.question)),
  historique: async (req, res) => res.json(await assistantService.historique(req.utilisateur.id, req.query)),
  etat: (req, res) => res.json(assistantService.etat()),
};
