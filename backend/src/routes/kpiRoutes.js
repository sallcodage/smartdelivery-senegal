const express = require("express");

const {
  getDashboardKPI,
  getKPIAvances,
  getPerformanceLivreurs
} = require("../controllers/kpiController");

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const router = express.Router();


// ======================================================
// TABLEAU DE BORD KPI
// GET /api/kpi/dashboard
// ADMINISTRATEUR UNIQUEMENT
// ======================================================

router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  getDashboardKPI
);


// ======================================================
// KPI AVANCES
// GET /api/kpi/avances
// ADMINISTRATEUR UNIQUEMENT
// ======================================================

router.get(
  "/avances",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  getKPIAvances
);


// ======================================================
// PERFORMANCE DES LIVREURS
// GET /api/kpi/performance-livreurs
// ADMINISTRATEUR UNIQUEMENT
// ======================================================

router.get(
  "/performance-livreurs",
  authMiddleware,
  roleMiddleware("ADMINISTRATEUR"),
  getPerformanceLivreurs
);


// ======================================================
// EXPORT DU ROUTER
// ======================================================

module.exports = router;