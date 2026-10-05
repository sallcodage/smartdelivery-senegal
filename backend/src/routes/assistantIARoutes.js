const express = require("express");

const {
  poserQuestion,
  obtenirHistorique
} = require("../controllers/assistantIAController");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);


// ======================================================
// CREATION DU ROUTER
// ======================================================
const router = express.Router();


// ======================================================
// POSER UNE QUESTION A L'ASSISTANT IA
// ======================================================
// POST /api/assistant-ia/question
router.post(
  "/question",
  authMiddleware,
  roleMiddleware("CLIENT"),
  poserQuestion
);


// ======================================================
// HISTORIQUE DES CONVERSATIONS
// ======================================================
// GET /api/assistant-ia/historique
router.get(
  "/historique",
  authMiddleware,
  roleMiddleware("CLIENT"),
  obtenirHistorique
);


// ======================================================
// EXPORT DU ROUTER
// ======================================================
module.exports = router;