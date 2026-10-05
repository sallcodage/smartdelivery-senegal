// Exécute les règles express-validator puis renvoie 400 avec le détail des champs en erreur.
const { validationResult } = require('express-validator');
const { requeteInvalide } = require('../utils/AppError');

function verifier(req, res, next) {
  const resultat = validationResult(req);
  if (!resultat.isEmpty()) {
    const details = resultat.array({ onlyFirstError: true }).map((e) => ({ champ: e.path, message: e.msg }));
    throw requeteInvalide('Certaines données sont invalides', details);
  }
  next();
}

const valider = (regles) => [...regles, verifier];

module.exports = valider;
