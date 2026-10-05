// Exécute les tests de la base (tests/db/schema.test.sql).
// Toutes les données de test sont annulées (ROLLBACK) : la base reste propre.
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

(async () => {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error(`Connexion PostgreSQL impossible (${err.code || err.message}). Vérifiez que PostgreSQL est démarré et DATABASE_URL dans .env.`);
    await pool.end();
    process.exit(1);
  }
  let reussis = 0;
  client.on('notice', (n) => {
    if (n.message.startsWith('OK')) reussis++;
    console.log('  ✔', n.message);
  });
  try {
    await client.query(fs.readFileSync(path.join(__dirname, '..', 'tests', 'db', 'schema.test.sql'), 'utf8'));
    console.log(`\n${reussis} vérifications réussies.`);
  } catch (err) {
    console.error('\n  ✘ TEST EN ÉCHEC :', err.message);
    process.exitCode = 1;
    await client.query('ROLLBACK').catch(() => {});
  } finally {
    client.release();
    await pool.end();
  }
})();
