// Choix de l'adaptateur selon IA_FOURNISSEUR : la logique de l'assistant ne change pas.
const ADAPTATEURS = {
  gemini: require('./gemini'),
  openai: require('./openai'),
  anthropic: require('./anthropic'),
};

const adaptateur = (fournisseur) => ADAPTATEURS[fournisseur];

module.exports = { adaptateur };
