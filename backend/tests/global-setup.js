// Recrée la base de test avant la suite de tests.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test'), override: true });

module.exports = async () => {
  const url = process.env.DATABASE_URL || '';
  if (!/test/i.test(url.split('/').pop())) {
    throw new Error('Sécurité : DATABASE_URL de .env.test doit viser une base dont le nom contient « test »');
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  const lire = (f) => fs.readFileSync(path.join(__dirname, '..', 'database', f), 'utf8');
  await client.query(lire('reset.sql'));
  await client.query(lire('schema.sql'));
  await client.query(lire('reference.sql'));
  await client.end();
};
