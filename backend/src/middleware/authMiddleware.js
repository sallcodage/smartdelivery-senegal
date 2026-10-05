const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Récupérer l'en-tête Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Accès refusé. Token manquant."
      });
    }

    // Format attendu :
    // Authorization: Bearer TOKEN
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Format du token invalide."
      });
    }

    const token = parts[1];

    // Vérifier le token JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Stocker les informations de l'utilisateur dans req.user
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (error) {
    console.error("Erreur authentification :", error.message);

    return res.status(401).json({
      success: false,
      message: "Token invalide ou expiré."
    });
  }
};

module.exports = authMiddleware;