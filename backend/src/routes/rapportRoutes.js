const express = require("express");

const {
  genererRapport,
  getTousLesRapports,
  getRapportParId
} = require("../controllers/rapportController");

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const router = express.Router();


// ======================================================
// GENERER UN RAPPORT
// POST /api/rapports
// ADMINISTRATEUR UNIQUEMENT
// ======================================================

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  genererRapport
);


// ======================================================
// LISTER TOUS LES RAPPORTS
// GET /api/rapports
// ADMINISTRATEUR UNIQUEMENT
// ======================================================

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  getTousLesRapports
);


// ======================================================
// CONSULTER UN RAPPORT PAR SON ID
// GET /api/rapports/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  getRapportParId
);


// ======================================================
// EXPORT DU ROUTER
// ======================================================

module.exports = router;