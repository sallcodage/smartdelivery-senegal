// Crée le premier compte Administrateur (aucune inscription publique d'admin).
// Les informations sont lues dans .env (ADMIN_*). Supprimez ADMIN_MOT_DE_PASSE
// du fichier .env une fois le compte créé.
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/db');
const { obligatoire } = require('../src/config/env');

const COUT_BCRYPT = 12;

(async () => {
  const admin = {
    nom: obligatoire('ADMIN_NOM').trim(),
    prenom: obligatoire('ADMIN_PRENOM').trim(),
    email: obligatoire('ADMIN_EMAIL').trim().toLowerCase(),
    telephone: obligatoire('ADMIN_TELEPHONE').replace(/[\s.-]/g, ''),
    motDePasse: obligatoire('ADMIN_MOT_DE_PASSE'),
  };
  if (admin.motDePasse.length < 8) {
    console.error('Le mot de passe administrateur doit contenir au moins 8 caractères.');
    process.exit(1);
  }

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
    const hash = await bcrypt.hash(admin.motDePasse, COUT_BCRYPT);
    const { rows } = await client.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone, role)
       VALUES ($1, $2, $3, $4, $5, 'ADMIN') RETURNING id`,
      [admin.nom, admin.prenom, admin.email, hash, admin.telephone]
    );
    await client.query('INSERT INTO administrateurs (id) VALUES ($1)', [rows[0].id]);
    await client.query('COMMIT');
    console.log(`Administrateur créé : ${admin.email}`);
    console.log('Pensez à retirer ADMIN_MOT_DE_PASSE de votre fichier .env.');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') console.error('Un compte existe déjà avec cet e-mail ou ce téléphone.');
    else console.error('Échec de la création :', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
