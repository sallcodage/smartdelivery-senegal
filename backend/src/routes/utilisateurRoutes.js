const express = require("express");

const {
  getMonProfil,
  getTousLesUtilisateurs,
  getUtilisateurParId,
  modifierMonProfil,
  modifierUtilisateurParId,
  supprimerUtilisateurParId
} = require("../controllers/utilisateurController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// ======================================================
// CONSULTER SON PROPRE PROFIL
// GET /api/utilisateurs/me
// Accessible à tout utilisateur connecté
// ======================================================
router.get(
  "/me",
  authMiddleware,
  getMonProfil
);


// ======================================================
// MODIFIER SON PROPRE PROFIL
// PUT /api/utilisateurs/me
// Accessible à tout utilisateur connecté
// ======================================================
router.put(
  "/me",
  authMiddleware,
  modifierMonProfil
);


// ======================================================
// CONSULTER TOUS LES UTILISATEURS
// GET /api/utilisateurs
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  getTousLesUtilisateurs
);


// ======================================================
// CONSULTER UN UTILISATEUR PAR ID
// GET /api/utilisateurs/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  getUtilisateurParId
);


// ======================================================
// MODIFIER UN UTILISATEUR PAR ID
// PUT /api/utilisateurs/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  modifierUtilisateurParId
);


// ======================================================
// SUPPRIMER UN UTILISATEUR PAR ID
// DELETE /api/utilisateurs/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  supprimerUtilisateurParId
);


module.exports = router;