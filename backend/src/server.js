const app = require('./app');
const config = require('./config/app');
const { pool } = require('./config/db');

(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('Connexion PostgreSQL impossible :', err.message);
    process.exit(1);
  }
  app.listen(config.port, () => {
    console.log(`API SmartDelivery démarrée sur http://localhost:${config.port}/api (${config.env})`);
  });
})();
