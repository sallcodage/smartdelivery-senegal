// Client HTTP unique de l'application : ajoute le jeton, gère la fin de session.
import axios from 'axios';
import { lireJeton, effacerSession } from './session';

export const EVENEMENT_SESSION_EXPIREE = 'smartdelivery:session-expiree';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const jeton = lireJeton();
  if (jeton) config.headers.Authorization = `Bearer ${jeton}`;
  return config;
});

api.interceptors.response.use(
  (reponse) => reponse,
  (erreur) => {
    const statut = erreur.response?.status;
    const message = erreur.response?.data?.message || '';
    const compteBloque = statut === 403 && /suspendu|attente/i.test(message);
    const estConnexion = erreur.config?.url?.startsWith('/auth/connexion');
    if (lireJeton() && !estConnexion && (statut === 401 || compteBloque)) {
      effacerSession();
      window.dispatchEvent(new CustomEvent(EVENEMENT_SESSION_EXPIREE, { detail: message }));
    }
    return Promise.reject(erreur);
  }
);

// Message lisible pour l'utilisateur, quelle que soit l'erreur
export function messageErreur(erreur, parDefaut = 'Une erreur est survenue. Réessayez.') {
  if (erreur?.response?.data?.message) return erreur.response.data.message;
  if (erreur?.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre. Réessayez.';
  if (erreur?.request && !erreur.response) return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  return parDefaut;
}

// Erreurs par champ renvoyées par l'API : { champ: message }
export function erreursDesChamps(erreur) {
  const details = erreur?.response?.data?.details || [];
  return Object.fromEntries(details.map((d) => [d.champ, d.message]));
}

export default api;
