// Configuration de l'assistant, lue dans .env à chaque appel (changer de fournisseur = modifier .env et redémarrer).
// La clé n'est JAMAIS écrite dans le code, les journaux ou la base de données.
const FOURNISSEURS = ['gemini', 'openai', 'anthropic'];
const MODELES_PAR_DEFAUT = { gemini: 'gemini-3.5-flash', openai: 'gpt-4.1-mini', anthropic: 'claude-sonnet-4-5' };

function lireConfiguration() {
  const fournisseur = (process.env.IA_FOURNISSEUR || 'gemini').trim().toLowerCase();
  const cle = (process.env.IA_CLE_API || '').trim();
  const actif = FOURNISSEURS.includes(fournisseur);
  return {
    fournisseur,
    modele: (process.env.IA_MODELE || MODELES_PAR_DEFAUT[fournisseur] || '').trim(),
    cle,
    delaiMs: Math.max(1000, parseInt(process.env.IA_DELAI_MS || '20000', 10) || 20000),
    reflexion: (process.env.IA_REFLEXION || '').trim(), // ex. « low » pour Gemini 3 (facultatif)
    disponible: actif && cle.length > 0,
    raisonIndisponible: !actif ? (fournisseur === 'aucun' ? 'DESACTIVE' : 'FOURNISSEUR_INCONNU') : !cle ? 'NON_CONFIGURE' : null,
  };
}

module.exports = { lireConfiguration, FOURNISSEURS, MODELES_PAR_DEFAUT };
