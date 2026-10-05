const router = require('express').Router();
const { body, query } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
const ctrl = require('../controllers/assistantController');
const valider = require('../middleware/valider');

// Protège le quota de l'API d'IA : 15 questions par minute et par client
const limiteurAssistant = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  keyGenerator: (req) => req.utilisateur.id,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de questions en peu de temps. Patientez une minute.' },
  skip: () => process.env.NODE_ENV === 'test',
});

router.get('/etat', ctrl.etat);
router.get('/historique', valider([query('page').optional().isInt({ min: 1 }), query('limite').optional().isInt({ min: 1, max: 50 })]), ctrl.historique);
router.post('/questions', limiteurAssistant, valider([
  body('question').isString().withMessage('Question obligatoire').bail().trim()
    .isLength({ min: 2, max: 1000 }).withMessage('La question doit contenir entre 2 et 1000 caractères'),
]), ctrl.poser);

module.exports = router;
