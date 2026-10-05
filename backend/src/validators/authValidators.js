const { body } = require('express-validator');
const r = require('./communs');

const inscriptionBase = [
  r.texte('nom'), r.texte('prenom'), r.email(), r.telephone(),
  r.motDePasse(), r.confirmation('confirmationMotDePasse', 'motDePasse'),
];

module.exports = {
  inscriptionClient: [...inscriptionBase, r.texte('adresse', 255)],
  inscriptionLivreur: [
    ...inscriptionBase, r.vehicule(), r.numeroPermis(),
    body('numeroPermis').if(body('vehicule').not().equals('VELO'))
      .notEmpty().withMessage('Numéro de permis obligatoire pour ce véhicule'),
    body('photoPermis').custom((v, { req }) => req.body.vehicule === 'VELO' || Boolean(req.files?.photoPermis?.length))
      .withMessage('Photo du permis obligatoire pour ce véhicule'),
  ],
  connexion: [r.email(), body('motDePasse').isString().notEmpty().withMessage('Mot de passe obligatoire')],
  motDePasseOublie: [r.email()],
  reinitialisation: [
    body('jeton').isString().isLength({ min: 64, max: 64 }).isHexadecimal().withMessage('Lien invalide'),
    r.motDePasse(), r.confirmation('confirmationMotDePasse', 'motDePasse'),
  ],
};
