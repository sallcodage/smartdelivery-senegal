// Chargement et vérification des variables d'environnement.
require('dotenv').config();

function obligatoire(nom) {
  const valeur = process.env[nom];
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom} (voir .env.example)`);
  return valeur;
}

module.exports = { obligatoire };
