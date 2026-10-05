const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, transaction } = require('../config/db');
const config = require('../config/app');
const { creerCompte } = require('./compteService');
const notifications = require('./notificationService');
const profil = require('./profilService');
const { nonAuthentifie, interdit, requeteInvalide } = require('../utils/AppError');

const sha256 = (texte) => crypto.createHash('sha256').update(texte).digest('hex');

// Hash factice : la vérification dure le même temps que l'e-mail existe ou non.
let hashFactice;
const obtenirHashFactice = async () => (hashFactice ||= await bcrypt.hash('compte-inexistant', config.bcryptCout));

// Inscription publique : le rôle est fixé par la route, jamais lu dans le formulaire.
async function inscrireClient(d) {
  const id = await transaction((c) => creerCompte(c, d, 'CLIENT', 'ACTIF'));
  return profil.obtenir(id);
}

async function inscrireLivreur(d) {
  const id = await transaction(async (c) => {
    const nouvelId = await creerCompte(c, d, 'LIVREUR', 'EN_ATTENTE');
    await notifications.notifierAdmins(c, `Nouvelle inscription livreur : ${d.prenom} ${d.nom}. Compte à valider.`);
    return nouvelId;
  });
  return profil.obtenir(id);
}

async function connecter(email, motDePasse) {
  const { rows } = await query(
    'SELECT id, nom, prenom, email, role, statut_compte, mot_de_passe FROM utilisateurs WHERE email = $1', [email]
  );
  const u = rows[0];
  const valide = await bcrypt.compare(motDePasse, u ? u.mot_de_passe : await obtenirHashFactice());
  if (!u || !valide) throw nonAuthentifie('E-mail ou mot de passe incorrect');
  if (u.statut_compte === 'EN_ATTENTE') throw interdit('Votre compte est en attente de validation par un administrateur');
  if (u.statut_compte === 'INACTIF') throw interdit('Votre compte est suspendu. Contactez le support SmartDelivery.');

  const jeton = jwt.sign({ sub: u.id, role: u.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiration, algorithm: 'HS256',
  });
  return { jeton, utilisateur: { id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role } };
}

// Retourne le jeton en clair (à envoyer par e-mail) ; seule son empreinte SHA-256 est stockée.
async function demanderReinitialisation(email) {
  const { rows } = await query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
  if (!rows[0]) return null;
  const jeton = crypto.randomBytes(32).toString('hex');
  await query(
    `INSERT INTO reinitialisations_mot_de_passe (utilisateur_id, token_hash, date_expiration)
     VALUES ($1, $2, now() + interval '30 minutes')`,
    [rows[0].id, sha256(jeton)]
  );
  return jeton;
}

async function reinitialiserMotDePasse(jeton, motDePasse) {
  await transaction(async (c) => {
    const { rows } = await c.query(
      `SELECT id, utilisateur_id FROM reinitialisations_mot_de_passe
       WHERE token_hash = $1 AND utilise_le IS NULL AND date_expiration > now() FOR UPDATE`,
      [sha256(jeton)]
    );
    if (!rows[0]) throw requeteInvalide('Lien de réinitialisation invalide ou expiré');
    const hash = await bcrypt.hash(motDePasse, config.bcryptCout);
    await c.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hash, rows[0].utilisateur_id]);
    // Invalide tous les liens en attente de cet utilisateur
    await c.query(
      'UPDATE reinitialisations_mot_de_passe SET utilise_le = now() WHERE utilisateur_id = $1 AND utilise_le IS NULL',
      [rows[0].utilisateur_id]
    );
  });
}

module.exports = { inscrireClient, inscrireLivreur, connecter, demanderReinitialisation, reinitialiserMotDePasse };
