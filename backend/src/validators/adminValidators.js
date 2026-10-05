const { body, query } = require('express-validator');
const r = require('./communs');
const { ROLES } = require('../utils/constantes');

module.exports = {
  listerUtilisateurs: [
    query('role').optional().isIn(ROLES),
    query('statut').optional().isIn(['ACTIF', 'INACTIF', 'EN_ATTENTE']),
    ...r.pagination(),
  ],
  creerUtilisateur: [
    body('role').isIn(ROLES).withMessage('Rôle invalide'),
    r.texte('nom'), r.texte('prenom'), r.email(), r.telephone(), r.motDePasse(),
    body('adresse').if(body('role').equals('CLIENT'))
      .isString().trim().notEmpty().withMessage('Adresse obligatoire pour un client').isLength({ max: 255 }),
    body('vehicule').if(body('role').equals('LIVREUR'))
      .isIn(['MOTO', 'SCOOTER', 'VELO', 'VOITURE']).withMessage('Véhicule obligatoire pour un livreur'),
    r.numeroPermis(),
  ],
  modifierUtilisateur: [
    r.idParam(), r.texte('nom').optional(), r.texte('prenom').optional(), r.email().optional(),
    r.telephone().optional(), r.texte('adresse', 255).optional(), r.vehicule().optional(), r.numeroPermis(),
  ],
  statut: [r.idParam(), body('statut').isIn(['ACTIF', 'INACTIF']).withMessage('Statut attendu : ACTIF ou INACTIF')],
  id: [r.idParam()],
  listerLivreurs: [
    query('disponible').optional().isBoolean().toBoolean(),
    query('recherche').optional().isString().trim().isLength({ max: 100 }),
  ],
  kpi: [query('periode').optional().isIn(['7j', '30j', '90j', '12m', 'tout']).withMessage('Période : 7j, 30j, 90j, 12m ou tout')],
  genererRapport: [
    body('type').isIn(['ACTIVITE_GLOBALE', 'PERFORMANCE_LIVREURS', 'FINANCIER']).withMessage('Type de rapport invalide'),
    body('periodeDebut').isISO8601({ strict: true }).withMessage('Date de début invalide (AAAA-MM-JJ)').bail()
      .custom((v) => v >= '2020-01-01').withMessage('Date de début trop ancienne'),
    body('periodeFin').isISO8601({ strict: true }).withMessage('Date de fin invalide (AAAA-MM-JJ)').bail()
      .custom((v, { req }) => v >= req.body.periodeDebut).withMessage('La date de fin doit suivre la date de début')
      .custom((v) => v <= new Date().toISOString().slice(0, 10)).withMessage('La date de fin ne peut pas être dans le futur'),
  ],
  listerRapports: [query('type').optional().isIn(['ACTIVITE_GLOBALE', 'PERFORMANCE_LIVREURS', 'FINANCIER']), query('page').optional().isInt({ min: 1 }), query('limite').optional().isInt({ min: 1, max: 100 })],
  simulation: [
    body('prixBase').isInt({ min: 0 }).toInt(),
    body('prixParKm').isInt({ min: 0 }).toInt(),
    body('montantMinimum').isInt({ min: 1 }).toInt(),
    body('arrondi').isInt({ min: 1 }).toInt(),
    body('partLivreurPourcentage').isFloat({ min: 0, max: 100 }).toFloat(),
  ],
  tarification: [
    body('prixBase').isInt({ min: 0 }).toInt(),
    body('prixParKm').isInt({ min: 0 }).toInt(),
    body('montantMinimum').isInt({ min: 1 }).toInt(),
    body('arrondi').isInt({ min: 1 }).toInt(),
    body('partLivreurPourcentage').isFloat({ min: 0, max: 100 }).toFloat(),
  ],
};
