// Création d'un compte : utilisateur + table fille selon le rôle (héritage).
const bcrypt = require('bcrypt');
const config = require('../config/app');

async function creerCompte(executant, d, role, statutCompte) {
  const hash = await bcrypt.hash(d.motDePasse, config.bcryptCout);
  const { rows } = await executant.query(
    `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone, role, statut_compte, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [d.nom, d.prenom, d.email, hash, d.telephone, role, statutCompte, d.photoUrl || null]
  );
  const { id } = rows[0];
  if (role === 'CLIENT') await executant.query('INSERT INTO clients (id, adresse) VALUES ($1, $2)', [id, d.adresse]);
  if (role === 'LIVREUR') {
    await executant.query(
      `INSERT INTO livreurs (id, vehicule, numero_permis, photo_permis_url, photo_vehicule_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, d.vehicule, d.numeroPermis || null, d.photoPermisUrl || null, d.photoVehiculeUrl || null]
    );
  }
  if (role === 'ADMIN') await executant.query('INSERT INTO administrateurs (id) VALUES ($1)', [id]);
  return id;
}

module.exports = { creerCompte };
