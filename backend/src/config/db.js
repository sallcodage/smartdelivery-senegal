// Accès PostgreSQL : pool partagé, requête simple et transaction.
const { Pool, types } = require('pg');
const { obligatoire } = require('./env');

// PostgreSQL renvoie NUMERIC et BIGINT sous forme de texte : on les convertit en nombres.
types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC
types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT (ex. count(*))

const pool = new Pool({ connectionString: obligatoire('DATABASE_URL') });

const query = (texte, valeurs) => pool.query(texte, valeurs);

/**
 * Exécute `travail(client)` dans une transaction.
 * L'auteur et le motif sont transmis à PostgreSQL (SET LOCAL) pour que les
 * triggers puissent historiser automatiquement chaque changement de statut.
 */
async function transaction(travail, { utilisateurId, motif } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (utilisateurId) await client.query("SELECT set_config('app.utilisateur_id', $1, true)", [utilisateurId]);
    if (motif) await client.query("SELECT set_config('app.motif', $1, true)", [motif]);
    const resultat = await travail(client);
    await client.query('COMMIT');
    return resultat;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
