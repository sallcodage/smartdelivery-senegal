// Limite les tentatives ÉCHOUÉES sur les routes sensibles (connexion, inscription, mot de passe) :
// un utilisateur légitime n'est jamais bloqué, une attaque par force brute l'est.
const { rateLimit } = require('express-rate-limit');

const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { limiteurAuth };
