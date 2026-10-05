// Gestion centralisée des erreurs : messages clairs, aucun détail technique exposé.
const multer = require('multer');
const { AppError } = require('../utils/AppError');
const { supprimerFichiers } = require('./televersement');

function messageDoublon(err) {
  const contrainte = err.constraint || '';
  if (contrainte.includes('email')) return 'Cette adresse e-mail est déjà utilisée';
  if (contrainte.includes('telephone')) return 'Ce numéro de téléphone est déjà utilisé';
  if (contrainte.includes('numero_permis')) return 'Ce numéro de permis est déjà enregistré';
  return 'Cette valeur existe déjà';
}

function routeIntrouvable(req, res) {
  res.status(404).json({ message: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function gestionErreurs(err, req, res, next) {
  supprimerFichiers(req); // requête refusée : on ne garde pas les photos déjà reçues

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (2 Mo maximum)' : 'Envoi de fichier invalide';
    return res.status(400).json({ message });
  }
  if (err instanceof AppError) {
    return res.status(err.statut).json({ message: err.message, ...(err.details && { details: err.details }) });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Corps de requête JSON invalide' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Requête trop volumineuse' });

  // Erreurs HTTP standard (ex. fichier statique absent)
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: err.status === 404 ? 'Fichier introuvable' : 'Requête invalide' });
  }

  // Règles métier garanties par la base (triggers SD001 à SD006)
  if (typeof err.code === 'string' && /^SD\d{3}$/.test(err.code)) {
    return res.status(409).json({ message: err.message });
  }
  switch (err.code) {
    case '23505': return res.status(409).json({ message: messageDoublon(err) });
    case '23503': return res.status(409).json({ message: 'Opération impossible : des données liées existent' });
    case '23514':
    case '22P02':
    case '22003': return res.status(400).json({ message: 'Donnée invalide' });
    default: break;
  }

  console.error('[Erreur interne]', err);
  return res.status(500).json({ message: 'Erreur interne du serveur' });
}

module.exports = { routeIntrouvable, gestionErreurs };
