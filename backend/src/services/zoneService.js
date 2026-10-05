const { query } = require('../config/db');

async function lister() {
  const { rows } = await query('SELECT id, nom, region FROM zones ORDER BY region, nom');
  return rows;
}

async function existe(id, executant = { query }) {
  const { rows } = await executant.query('SELECT 1 FROM zones WHERE id = $1', [id]);
  return rows.length > 0;
}

module.exports = { lister, existe };
