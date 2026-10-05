const bcrypt = require('bcrypt');
const { query, transaction } = require('../config/db');
const config = require('../config/app');
const { SELECT_UTILISATEUR, formaterUtilisateur } = require('../utils/utilisateurs');
const { mettreAJour } = require('../utils/sql');
const { introuvable, requeteInvalide } = require('../utils/AppError');

async function obtenir(id) {
  const { rows } = await query(`${SELECT_UTILISATEUR} WHERE u.id = $1`, [id]);
  if (!rows[0]) throw introuvable('Utilisateur introuvable');
  return formaterUtilisateur(rows[0]);
}

// Champs modifiables par l'utilisateur lui-même (l'e-mail et le rôle ne le sont pas).
async function modifier(utilisateur, d) {
  await transaction(async (c) => {
    await mettreAJour(c, 'utilisateurs', utilisateur.id, { nom: d.nom, prenom: d.prenom, telephone: d.telephone });
    if (utilisateur.role === 'CLIENT') await mettreAJour(c, 'clients', utilisateur.id, { adresse: d.adresse });
    if (utilisateur.role === 'LIVREUR') await mettreAJour(c, 'livreurs', utilisateur.id, { vehicule: d.vehicule });
  });
  return obtenir(utilisateur.id);
}

async function changerMotDePasse(id, ancien, nouveau) {
  const { rows } = await query('SELECT mot_de_passe FROM utilisateurs WHERE id = $1', [id]);
  if (!(await bcrypt.compare(ancien, rows[0].mot_de_passe))) throw requeteInvalide('Mot de passe actuel incorrect');
  const hash = await bcrypt.hash(nouveau, config.bcryptCout);
  await query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hash, id]);
}

module.exports = { obtenir, modifier, changerMotDePasse };
