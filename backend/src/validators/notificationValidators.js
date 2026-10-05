const { query } = require('express-validator');
const r = require('./communs');

module.exports = {
  lister: [query('statut').optional().isIn(['LUE', 'NON_LUE']), ...r.pagination()],
  id: [r.idParam()],
};
