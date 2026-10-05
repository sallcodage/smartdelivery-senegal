// Vérifie le JWT puis recharge l'utilisateur depuis PostgreSQL :
// une suspension de compte prend donc effet immédiatement.
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const config = require('../config/app');
const { nonAuthentifie, interdit } = require('../utils/AppError');

async function authentifier(req, res, next) {
  const [type, jeton] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !jeton) throw nonAuthentifie();

  let charge;
  try {
    charge = jwt.verify(jeton, config.jwt.secret, { algorithms: ['HS256'] });
  } catch {
    throw nonAuthentifie('Session expirée ou invalide, veuillez vous reconnecter');
  }

  const { rows } = await query(
    'SELECT id, nom, prenom, email, role, statut_compte FROM utilisateurs WHERE id = $1', [charge.sub]
  );
  const utilisateur = rows[0];
  if (!utilisateur) throw nonAuthentifie('Compte introuvable');
  if (utilisateur.statut_compte !== 'ACTIF') throw interdit('Votre compte est suspendu ou en attente de validation');

  req.utilisateur = {
    id: utilisateur.id, nom: utilisateur.nom, prenom: utilisateur.prenom,
    email: utilisateur.email, role: utilisateur.role,
  };
  next();
}

module.exports = authentifier;
