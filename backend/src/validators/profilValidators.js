const { body } = require('express-validator');
const r = require('./communs');

module.exports = {
  modifier: [
    r.texte('nom').optional(), r.texte('prenom').optional(), r.telephone().optional(),
    r.texte('adresse', 255).optional(), r.vehicule().optional(),
  ],
  motDePasse: [
    body('ancienMotDePasse').isString().notEmpty().withMessage('Mot de passe actuel obligatoire'),
    r.motDePasse('nouveauMotDePasse'), r.confirmation('confirmationMotDePasse', 'nouveauMotDePasse'),
  ],
};
