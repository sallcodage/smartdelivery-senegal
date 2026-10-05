const express = require("express");

const {
  getMesLivraisons,
  accepterLivraison,
  demarrerLivraison,
  terminerLivraison,
  mettreAJourPosition,
  getPositionLivraison
} = require("../controllers/livraisonController");

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const router = express.Router();


// ======================================================
// CONSULTER SES LIVRAISONS
// GET /api/livraisons/mes-livraisons
// LIVREUR UNIQUEMENT
// ======================================================

router.get(
  "/mes-livraisons",
  authMiddleware,
  roleMiddleware("LIVREUR"),
  getMesLivraisons
);


// ======================================================
// ACCEPTER UNE LIVRAISON
// PATCH /api/livraisons/:id/accepter
// LIVREUR UNIQUEMENT
// ======================================================

router.patch(
  "/:id/accepter",
  authMiddleware,
  roleMiddleware("LIVREUR"),
  accepterLivraison
);


// ======================================================
// DEMARRER UNE LIVRAISON
// PATCH /api/livraisons/:id/demarrer
// LIVREUR UNIQUEMENT
// ======================================================

router.patch(
  "/:id/demarrer",
  authMiddleware,
  roleMiddleware("LIVREUR"),
  demarrerLivraison
);


// ======================================================
// METTRE A JOUR LA POSITION GPS DU LIVREUR
// PATCH /api/livraisons/:id/position
// LIVREUR UNIQUEMENT
// ======================================================

router.patch(
  "/:id/position",
  authMiddleware,
  roleMiddleware("LIVREUR"),
  mettreAJourPosition
);


// ======================================================
// RECUPERER LA POSITION GPS D'UNE LIVRAISON
// GET /api/livraisons/:id/position
// LIVREUR UNIQUEMENT
// ======================================================

router.get(
  "/:id/position",
  authMiddleware,
  roleMiddleware("LIVREUR"),
  getPositionLivraison
);


// ======================================================
// TERMINER UNE LIVRAISON
// PATCH /api/livraisons/:id/terminer
// LIVREUR UNIQUEMENT
// ======================================================

router.patch(
  "/:id/terminer",
  authMiddleware,
  roleMiddleware("LIVREUR"),
  terminerLivraison
);


// ======================================================
// EXPORT DU ROUTER
// ======================================================

module.exports = router;