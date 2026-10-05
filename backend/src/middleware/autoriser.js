// Contrôle d'accès par rôle : autoriser('ADMIN'), autoriser('CLIENT', 'ADMIN')…
const { interdit } = require('../utils/AppError');

const autoriser = (...roles) => (req, res, next) => {
  if (!roles.includes(req.utilisateur.role)) throw interdit("Vous n'avez pas les droits pour cette action");
  next();
};

module.exports = autoriser;
