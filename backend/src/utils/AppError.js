// Erreur métier avec code HTTP, interceptée par le middleware d'erreurs.
class AppError extends Error {
  constructor(statut, message, details) {
    super(message);
    this.statut = statut;
    this.details = details;
  }
}

module.exports = {
  AppError,
  requeteInvalide: (message, details) => new AppError(400, message, details),
  nonAuthentifie: (message = 'Authentification requise') => new AppError(401, message),
  interdit: (message = 'Accès refusé') => new AppError(403, message),
  introuvable: (message = 'Ressource introuvable') => new AppError(404, message),
  conflit: (message) => new AppError(409, message),
};
