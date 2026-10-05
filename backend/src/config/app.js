// Configuration de l'API, lue depuis .env et vérifiée au démarrage.
const path = require('path');
const { obligatoire } = require('./env');

const env = process.env.NODE_ENV || 'development';
const jwtSecret = obligatoire('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET doit contenir au moins 32 caractères');

module.exports = {
  env,
  port: parseInt(process.env.PORT || '4000', 10),
  jwt: { secret: jwtSecret, expiration: process.env.JWT_EXPIRATION || '8h' },
  corsOrigines: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  bcryptCout: Math.max(4, parseInt(process.env.BCRYPT_COUT || '12', 10)),
  // Dossier des fichiers téléversés (photos). Chemin relatif = relatif au dossier backend/.
  dossierUploads: path.resolve(__dirname, '..', '..', process.env.UPLOADS_DIR || 'uploads'),
  // Dossier des rapports PDF générés
  dossierRapports: path.resolve(__dirname, '..', '..', process.env.RAPPORTS_DIR || 'rapports'),
  // Sans service e-mail, le lien de réinitialisation est renvoyé par l'API hors production.
  exposerLienReinitialisation: env !== 'production',
};
