// Diagnostic de la configuration de l'assistant : npm run ia:test
// Teste le fournisseur principal puis, s'il est déclaré, le fournisseur de relais (les clés ne sont jamais affichées).
require('dotenv').config();
const { lireConfiguration, lireRelais } = require('../src/services/ia/configuration');
const { adaptateur } = require('../src/services/ia/fournisseurs');

async function tester(titre, config, variable) {
  console.log(`\n── ${titre} ──`);
  console.log(`Fournisseur : ${config.fournisseur}`);
  console.log(`Modèle      : ${config.modele || '(aucun)'}`);
  console.log(`Clé API     : ${config.cle ? `définie (${config.cle.length} caractères)` : `ABSENTE (variable ${variable})`}`);
  if (!config.disponible) {
    console.error(`Non disponible : ${config.raisonIndisponible}.`);
    return false;
  }
  const debut = Date.now();
  try {
    const { texte } = await adaptateur(config.fournisseur).converser({
      config, systeme: 'Tu es un assistant de test. Réponds en français, en une phrase.',
      question: 'Réponds exactement : « SmartDelivery est connecté. »', outils: [], executerOutil: async () => ({}),
    });
    console.log(`Réponse (${Date.now() - debut} ms) : ${texte}`);
    console.log('Configuration opérationnelle.');
    return true;
  } catch (err) {
    console.error(`Échec : ${err.code || ''} ${err.message}`);
    if (err.detail) console.error(`Détail : ${err.detail.split(config.cle).join('***')}`);
    return false;
  }
}

(async () => {
  const principal = await tester('Fournisseur principal', lireConfiguration(), 'IA_CLE_API');
  let relais = null;
  if ((process.env.IA_RELAIS_FOURNISSEUR || '').trim()) {
    const cfg = lireRelais();
    relais = cfg ? await tester('Fournisseur de relais', cfg, 'IA_RELAIS_CLE_API')
      : (console.error('\n── Fournisseur de relais ──\nDéclaré mais incomplet (fournisseur inconnu ou IA_RELAIS_CLE_API absente).'), false);
  }
  console.log(`\nBilan : principal ${principal ? 'OK' : 'en échec'}${relais === null ? ', pas de relais' : `, relais ${relais ? 'OK' : 'en échec'}`}.`);
  // Petite attente avant de quitter (évite un message d'assertion de Node sous Windows)
  setTimeout(() => process.exit(principal || relais ? 0 : 1), 100);
})();
