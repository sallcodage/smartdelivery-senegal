// Règles de validation réutilisables (express-validator)
const { body, param, query } = require('express-validator');
const { VEHICULES, TYPES_COLIS, STATUTS_COMMANDE } = require('../utils/constantes');

const texte = (champ, max = 80) => body(champ)
  .isString().withMessage('Champ obligatoire').bail()
  .trim().notEmpty().withMessage('Champ obligatoire')
  .isLength({ max }).withMessage(`${max} caractères maximum`);

const email = (champ = 'email') => body(champ)
  .isString().withMessage('Adresse e-mail obligatoire').bail()
  .trim().toLowerCase()
  .isEmail().withMessage('Adresse e-mail invalide')
  .isLength({ max: 160 });

const telephone = (champ = 'telephone') => body(champ)
  .isString().withMessage('Numéro de téléphone obligatoire').bail()
  .customSanitizer((v) => v.replace(/[\s.-]/g, ''))
  .matches(/^\+?[0-9]{9,15}$/).withMessage('Numéro de téléphone invalide');

const motDePasse = (champ = 'motDePasse') => body(champ)
  .isString().withMessage('Mot de passe obligatoire').bail()
  .isLength({ min: 8, max: 72 }).withMessage('Le mot de passe doit contenir 8 à 72 caractères')
  .matches(/[A-Za-z]/).withMessage('Le mot de passe doit contenir au moins une lettre')
  .matches(/\d/).withMessage('Le mot de passe doit contenir au moins un chiffre');

const confirmation = (champ, reference) => body(champ)
  .custom((valeur, { req }) => valeur === req.body[reference])
  .withMessage('Les mots de passe ne correspondent pas');

const latitude = (champ) => body(champ).isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide').toFloat();
const longitude = (champ) => body(champ).isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide').toFloat();

const idParam = (nom = 'id') => param(nom).isUUID().withMessage('Identifiant invalide');

const vehicule = (champ = 'vehicule') => body(champ).isIn(VEHICULES).withMessage(`Véhicule attendu : ${VEHICULES.join(', ')}`);
const numeroPermis = () => body('numeroPermis').optional({ values: 'falsy' }).isString().trim().isLength({ max: 40 });
const typeColis = () => body('typeColis').isIn(TYPES_COLIS).withMessage(`Type de colis attendu : ${TYPES_COLIS.join(', ')}`);

const filtreStatuts = () => query('statut').optional().isString()
  .custom((v) => v.split(',').every((s) => STATUTS_COMMANDE.includes(s)))
  .withMessage('Statut inconnu');

const pagination = () => [
  query('page').optional().isInt({ min: 1 }),
  query('limite').optional().isInt({ min: 1, max: 100 }),
  query('recherche').optional().isString().trim().isLength({ max: 100 }),
];

module.exports = {
  texte, email, telephone, motDePasse, confirmation, latitude, longitude, idParam,
  vehicule, numeroPermis, typeColis, filtreStatuts, pagination,
};
