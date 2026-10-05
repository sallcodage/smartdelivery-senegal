// Crée le schéma et les données de référence.
//   npm run db:init   → installation initiale
//   npm run db:reset  → supprime tout puis réinstalle (développement)
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const lire = (f) => fs.readFileSync(path.join(__dirname, '..', 'database', f), 'utf8');

(async () => {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error(`Connexion PostgreSQL impossible (${err.code || err.message}). Vérifiez que PostgreSQL est démarré et DATABASE_URL dans .env.`);
    await pool.end();
    process.exit(1);
  }
  try {
    await client.query('BEGIN');
    if (process.argv.includes('--reset')) {
      await client.query(lire('reset.sql'));
      console.log('• Ancien schéma supprimé');
    }
    await client.query(lire('schema.sql'));
    console.log('• Schéma créé');
    await client.query(lire('reference.sql'));
    console.log('• Données de référence insérées (zones, tarification)');
    await client.query('COMMIT');
    console.log('Base SmartDelivery prête.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Échec de l\'initialisation :', err.message);
    if (err.code === '42710' || err.code === '42P07') {
      console.error('Le schéma existe déjà. Utilisez « npm run db:reset » pour le recréer.');
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
