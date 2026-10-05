import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SplashScreen from './SplashScreen';

// ─────────────────────────────────────────────────────────────────────
//  Démarrage de l'application :
//  Splash Screen affiché pendant au moins DUREE_MINIMALE_MS ET jusqu'à la fin
//  de la vérification de session faite par AuthContext (/auth/moi).
//  Ensuite, le routage existant décide : session valide → espace du rôle
//  (ou la page demandée), sinon → /connexion. Aucun changement du système JWT.
// ─────────────────────────────────────────────────────────────────────
export const DUREE_MINIMALE_MS = 2500;
export const DUREE_SORTIE_MS = 400;
const CLE_DEJA_VU = 'smartdelivery_splash_vu';

// Durée imposée : complète à l'ouverture de l'application (nouvel onglet ou fenêtre).
// Un rechargement dans le même onglet n'impose plus d'attente (la vérification reste).
// Les navigateurs pilotés par les tests automatisés (navigator.webdriver) ne l'attendent pas.
function dureeImposee() {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return 0;
  try {
    return sessionStorage.getItem(CLE_DEJA_VU) ? 0 : DUREE_MINIMALE_MS;
  } catch {
    return DUREE_MINIMALE_MS;
  }
}

export default function Demarrage({ children }) {
  const { initialisation } = useAuth(); // true tant que le jeton enregistré est en cours de vérification
  const [duree] = useState(dureeImposee);
  const [delaiEcoule, setDelaiEcoule] = useState(duree === 0);
  const [phase, setPhase] = useState(duree === 0 && !initialisation ? 'termine' : 'visible');

  useEffect(() => {
    if (duree === 0) return undefined;
    const minuterie = setTimeout(() => {
      setDelaiEcoule(true);
      try { sessionStorage.setItem(CLE_DEJA_VU, '1'); } catch { /* stockage indisponible : sans conséquence */ }
    }, duree);
    return () => clearTimeout(minuterie);
  }, [duree]);

  // Durée écoulée ET session vérifiée : début du fondu de sortie
  useEffect(() => {
    if (phase === 'visible' && delaiEcoule && !initialisation) setPhase('sortie');
  }, [phase, delaiEcoule, initialisation]);

  // Fin du fondu (effet séparé : changer de phase ne doit pas annuler cette minuterie)
  useEffect(() => {
    if (phase !== 'sortie') return undefined;
    const minuterie = setTimeout(() => setPhase('termine'), DUREE_SORTIE_MS);
    return () => clearTimeout(minuterie);
  }, [phase]);

  // Pas de défilement de la page pendant le splash
  useEffect(() => {
    if (phase === 'termine') return undefined;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = precedent; };
  }, [phase]);

  const actif = phase !== 'termine';
  return (
    <>
      {/* La page d'arrivée se prépare dessous, inaccessible tant que le splash est affiché */}
      <div className="contents" inert={actif || undefined}>{children}</div>
      {actif && <SplashScreen sortie={phase === 'sortie'} />}
    </>
  );
}
