const { body, query } = require('express-validator');
const r = require('./communs');

module.exports = {
  disponibilite: [body('disponibilite').isBoolean().withMessage('Valeur true ou false attendue').toBoolean()],
  position: [r.latitude('latitude'), r.longitude('longitude')],
  performances: [query('periode').optional().isIn(['7j', '30j', 'tout']).withMessage('Période : 7j, 30j ou tout')],
};
