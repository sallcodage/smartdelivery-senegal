import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cheminAccueil } from '../config/roles';
import { ChargementPage } from '../components/ui/Etats';

// Espace privé : connexion obligatoire + rôle autorisé
export function RouteProtegee({ roles }) {
  const { utilisateur, initialisation } = useAuth();
  const location = useLocation();
  if (initialisation) return <ChargementPage />;
  if (!utilisateur) return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />;
  if (!roles.includes(utilisateur.role)) return <Navigate to={cheminAccueil(utilisateur.role)} replace />;
  return <Outlet />;
}

// Pages d'accès (connexion, inscription) : un utilisateur connecté est renvoyé vers son espace
export function RoutePublique() {
  const { utilisateur, initialisation } = useAuth();
  if (initialisation) return <ChargementPage />;
  if (utilisateur) return <Navigate to={cheminAccueil(utilisateur.role)} replace />;
  return <Outlet />;
}

export function RedirectionAccueil() {
  const { utilisateur, initialisation } = useAuth();
  if (initialisation) return <ChargementPage />;
  return <Navigate to={utilisateur ? cheminAccueil(utilisateur.role) : '/connexion'} replace />;
}
