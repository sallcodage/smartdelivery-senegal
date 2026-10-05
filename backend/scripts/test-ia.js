// Diagnostic de la configuration de l'assistant : npm run ia:test
// Vérifie que le fournisseur, le modèle et la clé de .env fonctionnent (la clé n'est jamais affichée).
require('dotenv').config();
const { lireConfiguration } = require('../src/services/ia/configuration');
const { adaptateur } = require('../src/services/ia/fournisseurs');

(async () => {
  const config = lireConfiguration();
  console.log(`Fournisseur : ${config.fournisseur}`);
  console.log(`Modèle      : ${config.modele || '(aucun)'}`);
  console.log(`Clé API     : ${config.cle ? `définie (${config.cle.length} caractères)` : 'ABSENTE (variable IA_CLE_API)'}`);
  if (!config.disponible) {
    console.error(`\nAssistant non disponible : ${config.raisonIndisponible}. L'application fonctionnera en mode secours.`);
    process.exit(1);
  }
  const debut = Date.now();
  try {
    const { texte } = await adaptateur(config.fournisseur).converser({
      config, systeme: 'Tu es un assistant de test. Réponds en français, en une phrase.',
      question: 'Réponds exactement : « SmartDelivery est connecté. »', outils: [], executerOutil: async () => ({}),
    });
    console.log(`\nRéponse (${Date.now() - debut} ms) : ${texte}`);
    console.log('Configuration opérationnelle.');
  } catch (err) {
    console.error(`\nÉchec : ${err.code || ''} ${err.message}`);
    if (err.detail) console.error(`Détail : ${err.detail.replace(config.cle, '***')}`);
    process.exit(1);
  }
})();
