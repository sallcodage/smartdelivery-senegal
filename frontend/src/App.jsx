import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RedirectionAccueil, RouteProtegee, RoutePublique } from './routes/Gardes';
import Demarrage from './components/demarrage/Demarrage';
import { ChargementPage } from './components/ui/Etats';
import EspaceLayout from './layouts/EspaceLayout';
import Connexion from './pages/auth/Connexion';
import PageIntrouvable from './pages/commun/PageIntrouvable';

// Chargement à la demande : chaque écran (et les bibliothèques lourdes : cartes, graphiques)
// n'est téléchargé que lorsqu'il est ouvert. La page de connexion reste immédiate.
const page = (chargeur) => lazy(chargeur);
const Inscription = page(() => import('./pages/auth/Inscription'));
const MotDePasseOublie = page(() => import('./pages/auth/MotDePasseOublie'));
const Reinitialisation = page(() => import('./pages/auth/Reinitialisation'));
const Conditions = page(() => import('./pages/auth/PagesLegales').then((m) => ({ default: m.Conditions })));
const Confidentialite = page(() => import('./pages/auth/PagesLegales').then((m) => ({ default: m.Confidentialite })));
const Profil = page(() => import('./pages/commun/Profil'));
const Notifications = page(() => import('./pages/commun/Notifications'));

// Un espace par rôle : [chemin, écran]. Chaque espace est protégé par RouteProtegee.
const ESPACES = [
  {
    role: 'ADMIN', base: '/admin',
    pages: [
      ['', page(() => import('./pages/admin/TableauDeBord'))],
      ['commandes', page(() => import('./pages/admin/Commandes'))],
      ['commandes/:id', page(() => import('./pages/admin/DetailCommande'))],
      ['livraisons', page(() => import('./pages/admin/Livraisons'))],
      ['utilisateurs', page(() => import('./pages/admin/Utilisateurs'))],
      ['livreurs', page(() => import('./pages/admin/Livreurs'))],
      ['livreurs/:id', page(() => import('./pages/admin/DetailLivreur'))],
      ['clients', page(() => import('./pages/admin/Clients'))],
      ['clients/:id', page(() => import('./pages/admin/DetailClient'))],
      ['statistiques', page(() => import('./pages/admin/Statistiques'))],
      ['rapports', page(() => import('./pages/admin/Rapports'))],
      ['parametres', page(() => import('./pages/admin/Parametres'))],
    ],
  },
  {
    role: 'CLIENT', base: '/client',
    pages: [
      ['', page(() => import('./pages/client/Accueil'))],
      ['commandes', page(() => import('./pages/client/MesCommandes'))],
      ['commandes/nouvelle', page(() => import('./pages/client/NouvelleCommande'))],
      ['commandes/:id', page(() => import('./pages/client/DetailCommande'))],
      ['commandes/:id/modifier', page(() => import('./pages/client/ModifierCommande'))],
      ['commandes/:id/suivi', page(() => import('./pages/client/SuiviLivraison'))],
      ['assistant', page(() => import('./pages/client/Assistant'))],
    ],
  },
  {
    role: 'LIVREUR', base: '/livreur',
    pages: [
      ['', page(() => import('./pages/livreur/Accueil'))],
      ['livraisons', page(() => import('./pages/livreur/MesLivraisons'))],
      ['livraisons/:id', page(() => import('./pages/livreur/DetailLivraison'))],
      ['livraisons/:id/en-cours', page(() => import('./pages/livreur/LivraisonEnCours'))],
      ['livraisons/:id/terminee', page(() => import('./pages/livreur/LivraisonTerminee'))],
      ['historique', page(() => import('./pages/livreur/Historique'))],
      ['performances', page(() => import('./pages/livreur/Performances'))],
    ],
  },
];

export default function App() {
  return (
    <Demarrage>
      <Suspense fallback={<ChargementPage />}>
        <Routes>
          <Route path="/" element={<RedirectionAccueil />} />
          <Route path="/login" element={<Navigate to="/connexion" replace />} />

          <Route element={<RoutePublique />}>
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
            <Route path="/reinitialiser-mot-de-passe" element={<Reinitialisation />} />
          </Route>
          <Route path="/conditions" element={<Conditions />} />
          <Route path="/confidentialite" element={<Confidentialite />} />

          {ESPACES.map(({ role, base, pages }) => (
            <Route key={role} element={<RouteProtegee roles={[role]} />}>
              <Route path={base} element={<EspaceLayout role={role} />}>
                <Route path="notifications" element={<Notifications />} />
                <Route path="profil" element={<Profil />} />
                {pages.map(([chemin, Ecran]) => (chemin === ''
                  ? <Route key="accueil" index element={<Ecran />} />
                  : <Route key={chemin} path={chemin} element={<Ecran />} />))}
              </Route>
            </Route>
          ))}

          <Route path="*" element={<PageIntrouvable />} />
        </Routes>
      </Suspense>
    </Demarrage>
  );
}
