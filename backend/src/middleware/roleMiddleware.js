const roleMiddleware = (...rolesAutorises) => {
  return (req, res, next) => {
    // Vérifier que authMiddleware a bien ajouté req.user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié."
      });
    }

    // Vérifier si le rôle de l'utilisateur est autorisé
    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Accès interdit. Vous n'avez pas les permissions nécessaires."
      });
    }

    next();
  };
};

module.exports = roleMiddleware;