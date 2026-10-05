import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, UserCircle, X } from 'lucide-react';
import Logo from '../components/ui/Logo';
import { Avatar } from '../components/ui/Divers';
import ModaleConfirmation from '../components/ui/Modale';
import { Chargement } from '../components/ui/Etats';
import { useAuth } from '../context/AuthContext';
import { NotificationsProvider, useNotifications } from '../context/NotificationsContext';
import { PositionLivreurProvider } from '../context/PositionLivreurContext';
import { NAVIGATION } from '../config/navigation';
import { LIBELLES_ROLE } from '../config/roles';

// Un lien parent (ex. « Mes commandes ») n'est pas actif sur une sous-page qui a son propre lien
const estActif = (isActive, exclure) => isActive && !(exclure && window.location.pathname.startsWith(exclure));

function Pastille({ nombre, sombre }) {
  if (!nombre) return null;
  return (
    <span className={`ml-auto min-w-5 rounded-full px-1.5 text-center text-xs font-bold ${sombre ? 'bg-vert-500 text-white' : 'bg-red-600 text-white'}`}>
      {nombre > 99 ? '99+' : nombre}
    </span>
  );
}

function BarreLaterale({ liens, ouverte, onFermer, onDeconnexion, mobileTiroir }) {
  const { utilisateur } = useAuth();
  const { nonLues } = useNotifications();
  return (
    <>
      {ouverte && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onFermer} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-nuit-900 text-slate-300 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${ouverte ? 'translate-x-0' : '-translate-x-full'} ${mobileTiroir ? '' : 'max-lg:hidden'}`}
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo sombre taille="sm" />
          <button type="button" onClick={onFermer} className="rounded p-1 text-slate-300 hover:text-white lg:hidden" aria-label="Fermer le menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {liens.map(({ chemin, libelle, icone: Icone, exact, compteur, exclure }) => (
            <NavLink
              key={chemin} to={chemin} end={exact} onClick={onFermer}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${estActif(isActive, exclure) ? 'bg-vert-500 text-white' : 'hover:bg-nuit-700 hover:text-white'}`}
            >
              <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
              {libelle}
              {compteur && <Pastille nombre={nonLues} sombre />}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-nuit-700 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar utilisateur={utilisateur} taille="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{utilisateur.prenom} {utilisateur.nom}</p>
              <p className="text-xs text-slate-300">{LIBELLES_ROLE[utilisateur.role]}</p>
            </div>
          </div>
          <button
            type="button" onClick={onDeconnexion}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-nuit-700 hover:text-red-200"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" /> Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

function MenuUtilisateur({ base, onDeconnexion }) {
  const { utilisateur } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef(null);
  useEffect(() => {
    const fermer = (e) => zone.current && !zone.current.contains(e.target) && setOuvert(false);
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, []);
  return (
    <div className="relative" ref={zone}>
      <button type="button" onClick={() => setOuvert((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 hover:bg-slate-100" aria-expanded={ouvert} aria-haspopup="menu" aria-label="Menu du compte">
        <Avatar utilisateur={utilisateur} taille="sm" />
        <span className="hidden text-sm font-medium text-slate-700 sm:inline">{utilisateur.prenom}</span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:inline" aria-hidden="true" />
      </button>
      {ouvert && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2">
            <p className="truncate text-sm font-semibold text-slate-900">{utilisateur.prenom} {utilisateur.nom}</p>
            <p className="truncate text-xs text-slate-500">{utilisateur.email}</p>
          </div>
          <Link role="menuitem" to={`${base}/profil`} onClick={() => setOuvert(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <UserCircle className="h-4 w-4" aria-hidden="true" /> Mon profil
          </Link>
          <button role="menuitem" type="button" onClick={() => { setOuvert(false); onDeconnexion(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

function BarreBasse({ liens }) {
  const { nonLues } = useNotifications();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Navigation">
      {liens.map(({ chemin, libelle, libelleCourt, icone: Icone, exact, compteur, exclure }) => (
        <NavLink
          key={chemin} to={chemin} end={exact} aria-label={libelle}
          className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${estActif(isActive, exclure) ? 'text-vert-600' : 'text-slate-500'}`}
        >
          <Icone className="h-6 w-6" aria-hidden="true" />
          {libelleCourt || libelle}
          {compteur && nonLues > 0 && <span className="absolute right-[calc(50%-18px)] top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-label={`${nonLues} non lues`} />}
        </NavLink>
      ))}
    </nav>
  );
}

function Cadre({ role }) {
  const { deconnexion } = useAuth();
  const { nonLues } = useNotifications();
  const { pathname } = useLocation();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const liens = NAVIGATION[role];
  const base = liens[0].chemin;
  const barreBasse = role !== 'ADMIN'; // Client et Livreur : navigation d'application mobile (prototype)

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  async function confirmerDeconnexion() {
    setEnvoi(true);
    await deconnexion(); // RouteProtegee redirige vers /connexion, qui affiche « Vous êtes déconnecté »
  }

  return (
    <div className="min-h-screen lg:flex">
      <BarreLaterale liens={liens} ouverte={menuOuvert} onFermer={() => setMenuOuvert(false)} onDeconnexion={() => setConfirmation(true)} mobileTiroir={!barreBasse} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          {!barreBasse && (
            <button type="button" onClick={() => setMenuOuvert(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="lg:hidden"><Logo taille="sm" sousTitre="" /></div>
          <div className="ml-auto flex items-center gap-2">
            <Link to={`${base}/notifications`} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label={`Notifications (${nonLues} non lues)`}>
              <Bell className="h-5 w-5" />
              {nonLues > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{nonLues > 99 ? '99+' : nonLues}</span>}
            </Link>
            <MenuUtilisateur base={base} onDeconnexion={() => setConfirmation(true)} />
          </div>
        </header>
        <main className={`mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8 ${barreBasse ? 'pb-24 lg:pb-8' : ''}`}>
          <Suspense fallback={<Chargement />}><Outlet /></Suspense>
        </main>
      </div>
      {barreBasse && <BarreBasse liens={liens.filter((l) => l.mobile !== false)} />}
      <ModaleConfirmation
        ouverte={confirmation} icone={LogOut} variante="danger" titre="Se déconnecter ?"
        message="Vous devrez saisir à nouveau vos identifiants pour accéder à votre espace."
        libelleConfirmer="Se déconnecter" chargement={envoi}
        onAnnuler={() => setConfirmation(false)} onConfirmer={confirmerDeconnexion}
      />
    </div>
  );
}

export default function EspaceLayout({ role }) {
  return (
    <NotificationsProvider>
      {role === 'LIVREUR'
        ? <PositionLivreurProvider><Cadre role={role} /></PositionLivreurProvider>
        : <Cadre role={role} />}
    </NotificationsProvider>
  );
}
