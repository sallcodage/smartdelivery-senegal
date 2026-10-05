const authService = require('../services/authService');
const profilService = require('../services/profilService');
const config = require('../config/app');
const { cheminRelatif, fichierDuChamp } = require('../middleware/televersement');

async function inscrireClient(req, res) {
  const utilisateur = await authService.inscrireClient({
    ...req.body, photoUrl: cheminRelatif(fichierDuChamp(req, 'photo')),
  });
  res.status(201).json({ message: 'Compte créé. Vous pouvez maintenant vous connecter.', utilisateur });
}

async function inscrireLivreur(req, res) {
  const utilisateur = await authService.inscrireLivreur({
    ...req.body,
    photoUrl: cheminRelatif(fichierDuChamp(req, 'photo')),
    photoPermisUrl: cheminRelatif(fichierDuChamp(req, 'photoPermis')),
    photoVehiculeUrl: cheminRelatif(fichierDuChamp(req, 'photoVehicule')),
  });
  res.status(201).json({
    message: 'Inscription enregistrée. Votre compte sera activé après validation par un administrateur.',
    utilisateur,
  });
}

async function connecter(req, res) {
  res.json(await authService.connecter(req.body.email, req.body.motDePasse));
}

// JWT sans état : la déconnexion consiste à supprimer le jeton côté client.
function deconnecter(req, res) {
  res.status(204).end();
}

async function moi(req, res) {
  res.json({ utilisateur: await profilService.obtenir(req.utilisateur.id) });
}

async function motDePasseOublie(req, res) {
  const jeton = await authService.demanderReinitialisation(req.body.email);
  const reponse = { message: 'Si un compte correspond à cette adresse, un lien de réinitialisation a été généré.' };
  if (jeton && config.exposerLienReinitialisation) {
    // Aucun service e-mail n'est prévu : hors production, le lien est renvoyé pour la démonstration.
    reponse.lienReinitialisation = `${config.frontendUrl}/reinitialiser-mot-de-passe?jeton=${jeton}`;
  }
  res.json(reponse);
}

async function reinitialiserMotDePasse(req, res) {
  await authService.reinitialiserMotDePasse(req.body.jeton, req.body.motDePasse);
  res.json({ message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
}

module.exports = { inscrireClient, inscrireLivreur, connecter, deconnecter, moi, motDePasseOublie, reinitialiserMotDePasse };
