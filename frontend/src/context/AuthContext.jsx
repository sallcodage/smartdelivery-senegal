import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { EVENEMENT_SESSION_EXPIREE } from '../api/client';
import { effacerSession, enregistrerJeton, lireJeton } from '../api/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [initialisation, setInitialisation] = useState(Boolean(lireJeton()));
  // Message à afficher sur l'écran de connexion (session expirée, déconnexion…)
  const [annonce, setAnnonce] = useState(null);

  // Au chargement : si un jeton existe, on recharge l'utilisateur depuis l'API
  useEffect(() => {
    if (!lireJeton()) return;
    authApi.moi()
      .then(setUtilisateur)
      .catch(() => effacerSession())
      .finally(() => setInitialisation(false));
  }, []);

  // Jeton expiré ou compte suspendu pendant l'utilisation
  useEffect(() => {
    const surExpiration = (e) => {
      setUtilisateur(null);
      setAnnonce({ type: 'avertissement', texte: e.detail || 'Votre session a expiré. Veuillez vous reconnecter.' });
    };
    window.addEventListener(EVENEMENT_SESSION_EXPIREE, surExpiration);
    return () => window.removeEventListener(EVENEMENT_SESSION_EXPIREE, surExpiration);
  }, []);

  const connexion = useCallback(async (email, motDePasse, memoriser) => {
    const { jeton } = await authApi.connexion(email, motDePasse);
    enregistrerJeton(jeton, memoriser);
    const profil = await authApi.moi();
    setUtilisateur(profil);
    setAnnonce(null);
    return profil;
  }, []);

  const deconnexion = useCallback(async () => {
    try { await authApi.deconnexion(); } catch { /* la session locale est supprimée dans tous les cas */ }
    effacerSession();
    setAnnonce({ type: 'succes', texte: 'Vous êtes déconnecté.' });
    setUtilisateur(null); // la garde de route redirige alors vers /connexion
  }, []);

  const valeur = useMemo(() => ({
    utilisateur, setUtilisateur, initialisation, connexion, deconnexion, annonce,
  }), [utilisateur, initialisation, connexion, deconnexion, annonce]);

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexte = useContext(AuthContext);
  if (!contexte) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return contexte;
}
