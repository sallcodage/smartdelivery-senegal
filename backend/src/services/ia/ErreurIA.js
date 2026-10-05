// Erreurs du fournisseur d'IA, classées pour choisir le bon message et le mode secours.
const MESSAGES = {
  NON_CONFIGURE: "L'assistant IA n'est pas encore configuré sur ce serveur.",
  DESACTIVE: "L'assistant IA est désactivé sur ce serveur.",
  FOURNISSEUR_INCONNU: "Le fournisseur d'IA configuré n'est pas pris en charge.",
  CLE_INVALIDE: "La clé du service d'IA est refusée.",
  MODELE_INCONNU: "Le modèle d'IA configuré est introuvable.",
  QUOTA: "Le service d'IA a atteint sa limite d'utilisation pour le moment.",
  INDISPONIBLE: "Le service d'IA est momentanément indisponible.",
  DELAI: "Le service d'IA a mis trop de temps à répondre.",
  REQUETE: "Le service d'IA a refusé la requête.",
  BLOQUEE: "Le service d'IA a bloqué cette réponse.",
  REPONSE_VIDE: "Le service d'IA n'a pas renvoyé de réponse.",
  TROP_ETAPES: "Le service d'IA n'a pas abouti à une réponse.",
};

class ErreurIA extends Error {
  constructor(code, detail) {
    super(MESSAGES[code] || code);
    this.code = code;
    this.detail = detail; // pour les journaux du serveur uniquement
  }
}

// Appel HTTP avec délai maximal et classement des erreurs
async function appelHttp(url, options, delaiMs) {
  let reponse;
  try {
    reponse = await fetch(url, { ...options, signal: AbortSignal.timeout(delaiMs) });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') throw new ErreurIA('DELAI');
    throw new ErreurIA('INDISPONIBLE', err.message);
  }
  if (reponse.ok) return reponse.json();
  const corps = await reponse.text().catch(() => '');
  const code = { 400: 'REQUETE', 401: 'CLE_INVALIDE', 403: 'CLE_INVALIDE', 404: 'MODELE_INCONNU', 429: 'QUOTA' }[reponse.status]
    || (reponse.status >= 500 ? 'INDISPONIBLE' : 'REQUETE');
  throw new ErreurIA(code, `HTTP ${reponse.status} ${corps.slice(0, 300)}`);
}

module.exports = { ErreurIA, appelHttp, MESSAGES };
