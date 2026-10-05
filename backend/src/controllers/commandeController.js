const commandeService = require('../services/commandeService');
const suiviService = require('../services/suiviService');

async function lister(req, res) {
  const statuts = req.query.statut ? req.query.statut.split(',') : [];
  res.json(await commandeService.lister(req.utilisateur, { ...req.query, statuts }));
}
async function obtenir(req, res) {
  res.json({ commande: await commandeService.obtenir(req.params.id, req.utilisateur) });
}
async function creer(req, res) {
  res.status(201).json({ commande: await commandeService.creer(req.utilisateur, req.body) });
}
async function modifier(req, res) {
  res.json({ commande: await commandeService.modifier(req.params.id, req.utilisateur, req.body) });
}

// Une seule fonction pour toutes les transitions : /commandes/:id/valider, /affecter, /accepter…
const MESSAGES = {
  valider: 'Commande validée', affecter: 'Livreur affecté', accepter: 'Livraison acceptée',
  refuser: 'Livraison refusée', demarrer: 'Livraison démarrée', terminer: 'Livraison terminée',
  confirmer: 'Réception confirmée', annuler: 'Commande annulée',
};
const action = (nom) => async (req, res) => {
  const { motif, livreurId, automatique, note } = req.body || {};
  const commande = await commandeService.executerAction(nom, req.params.id, req.utilisateur, {
    motif, livreurId, automatique, note,
  });
  res.json({ message: MESSAGES[nom], commande });
};

async function envoyerPosition(req, res) {
  res.status(201).json({ position: await suiviService.enregistrerPosition(req.params.id, req.utilisateur, req.body) });
}
async function suivre(req, res) {
  res.json(await suiviService.suivre(req.params.id, req.utilisateur));
}

module.exports = { lister, obtenir, creer, modifier, action, envoyerPosition, suivre };
