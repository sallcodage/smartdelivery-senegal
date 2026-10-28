// Configuration de l'assistant, lue dans .env à chaque appel (changer de fournisseur = modifier .env et redémarrer).
// La clé n'est JAMAIS écrite dans le code, les journaux ou la base de données.
//
// Fournisseur principal : IA_FOURNISSEUR, IA_MODELE, IA_CLE_API
// Fournisseur de relais (facultatif), utilisé si le principal échoue :
//   IA_RELAIS_FOURNISSEUR, IA_RELAIS_MODELE, IA_RELAIS_CLE_API
const FOURNISSEURS = ['groq', 'gemini', 'openai', 'anthropic'];
const MODELES_PAR_DEFAUT = {
  groq: 'openai/gpt-oss-120b',
  gemini: 'gemini-3.5-flash-lite',
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
};
// Adresses des API compatibles avec le format OpenAI (modifiables par variable d'environnement)
const URLS_COMPATIBLES_OPENAI = {
  groq: () => process.env.IA_GROQ_URL || 'https://api.groq.com/openai/v1',
  openai: () => process.env.IA_OPENAI_URL || 'https://api.openai.com/v1',
};

const delai = () => Math.max(1000, parseInt(process.env.IA_DELAI_MS || '20000', 10) || 20000);

function construire(prefixe, fournisseurParDefaut) {
  const lire = (nom) => (process.env[`${prefixe}${nom}`] || '').trim();
  const fournisseur = (lire('FOURNISSEUR') || fournisseurParDefaut).toLowerCase();
  const cle = lire('CLE_API');
  const actif = FOURNISSEURS.includes(fournisseur);
  return {
    fournisseur,
    modele: lire('MODELE') || MODELES_PAR_DEFAUT[fournisseur] || '',
    cle,
    urlBase: URLS_COMPATIBLES_OPENAI[fournisseur]?.() || null,
    delaiMs: delai(),
    reflexion: (process.env.IA_REFLEXION || '').trim(), // ex. « low » pour Gemini 3 (facultatif)
    disponible: actif && cle.length > 0,
    raisonIndisponible: !actif ? (fournisseur === 'aucun' ? 'DESACTIVE' : 'FOURNISSEUR_INCONNU') : !cle ? 'NON_CONFIGURE' : null,
  };
}

function lireConfiguration() {
  return construire('IA_', 'gemini');
}

// Relais : seulement s'il est déclaré et utilisable
function lireRelais() {
  if (!(process.env.IA_RELAIS_FOURNISSEUR || '').trim()) return null;
  const relais = construire('IA_RELAIS_', '');
  return relais.disponible ? relais : null;
}

module.exports = { lireConfiguration, lireRelais, FOURNISSEURS, MODELES_PAR_DEFAUT };
