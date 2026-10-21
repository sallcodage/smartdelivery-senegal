import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Bell, Bike, Bot, Calculator, ChartColumn, CircleCheck, Clock, LayoutDashboard,
  LogIn, Mail, MapPin, MapPinned, Menu, Navigation, Package, Route, ShieldCheck, Smartphone, Star, Truck, UserPlus, Users, X,
} from 'lucide-react';
import Logo, { LogoMarque } from '../../components/ui/Logo';
import ApercuSuivi from '../../components/accueil/ApercuSuivi';

// ─────────────────────────────────────────────────────────────────────
//  Page d'accueil publique (route « / » pour un visiteur non connecté).
//  Tout ce qui est présenté correspond à une fonctionnalité réelle de l'application ;
//  aucun chiffre d'activité n'est affiché (les données de la plateforme sont des données de démonstration).
// ─────────────────────────────────────────────────────────────────────

const LIENS = [
  { ancre: 'accueil', libelle: 'Accueil' },
  { ancre: 'services', libelle: 'Services' },
  { ancre: 'fonctionnement', libelle: 'Comment ça marche' },
  { ancre: 'a-propos', libelle: 'À propos' },
];

// « Commander une livraison » : après connexion, un client arrive directement sur le formulaire de commande
const COMMANDER = { to: '/connexion', state: { depuis: '/client/commandes/nouvelle' } };

const ATOUTS = [
  { icone: Calculator, titre: 'Prix immédiat', texte: 'Connu avant de valider' },
  { icone: Navigation, titre: 'Suivi en direct', texte: 'Le livreur sur la carte' },
  { icone: MapPin, titre: 'Livreur proche', texte: 'Affecté selon la distance' },
  { icone: Bell, titre: 'Notifications', texte: 'À chaque étape' },
];

const SERVICES = [
  { icone: Package, titre: 'Livraison de colis', texte: 'Documents, produits, repas ou autres colis : placez le départ et l\'arrivée sur la carte, indiquez le type de colis et son poids.' },
  { icone: Navigation, titre: 'Suivi des commandes', texte: 'Suivez votre livreur en temps réel sur la carte et consultez l\'historique de chaque étape de votre commande.' },
  { icone: Calculator, titre: 'Tarif transparent', texte: 'Le prix est calculé automatiquement selon la distance et s\'affiche avant que vous ne confirmiez la commande.' },
  { icone: Bot, titre: 'Assistant intelligent', texte: 'Posez vos questions sur vos commandes : l\'assistant répond à partir de vos propres données, sans rien inventer.' },
  { icone: Bike, titre: 'Devenir livreur', texte: 'À moto, en scooter, à vélo ou en voiture : inscrivez-vous, faites valider votre compte et recevez des livraisons.' },
  { icone: ChartColumn, titre: 'Pilotage de l\'activité', texte: 'Pour les gestionnaires : tableau de bord, indicateurs de performance, supervision des livraisons et rapports PDF.' },
];

const ETAPES = [
  { icone: MapPinned, titre: 'Commandez', texte: 'Indiquez le point de départ et d\'arrivée sur la carte. Le prix s\'affiche immédiatement.' },
  { icone: Truck, titre: 'Un livreur prend en charge', texte: 'Votre commande est validée et confiée à un livreur disponible proche du point de départ.' },
  { icone: CircleCheck, titre: 'Suivez et recevez', texte: 'Suivez le trajet en direct, confirmez la réception de votre colis et notez le livreur.' },
];

const PUBLICS = [
  {
    icone: Users, titre: 'Pour les clients',
    points: ['Commande en quelques clics, sans appel téléphonique', 'Prix connu avant de confirmer', 'Suivi en direct et notifications', 'Historique de toutes vos commandes'],
  },
  {
    icone: Bike, titre: 'Pour les livreurs',
    points: ['Livraisons affectées selon votre position', 'Accepter ou refuser une course', 'Un espace pensé pour le téléphone', 'Vos gains et vos performances'],
  },
  {
    icone: LayoutDashboard, titre: 'Pour les gestionnaires',
    points: ['Validation des commandes et des livreurs', 'Affectation au livreur le plus proche', 'Indicateurs de performance calculés en direct', 'Rapports d\'activité en PDF'],
  },
];

// Adresse de contact du projet
const EMAIL_CONTACT = 'smartdeliverysn@gmail.com';

const ZONES = ['Dakar', 'Pikine', 'Guédiawaye', 'Rufisque', 'Keur Massar', 'Thiès'];

// Défilement doux vers une section (sauf si l'utilisateur préfère réduire les animations)
function allerA(ancre, e) {
  const cible = document.getElementById(ancre);
  if (!cible) return;
  e?.preventDefault();
  const doux = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  cible.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' });
  window.history.replaceState(null, '', `#${ancre}`);
}

function BarreNavigation() {
  const [ouvert, setOuvert] = useState(false);
  const [defile, setDefile] = useState(false);

  useEffect(() => {
    const surDefilement = () => setDefile(window.scrollY > 12);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);

  useEffect(() => {
    if (!ouvert) return undefined;
    const echap = (e) => e.key === 'Escape' && setOuvert(false);
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [ouvert]);

  const clicLien = (ancre) => (e) => { setOuvert(false); allerA(ancre, e); };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${defile || ouvert ? 'bg-white shadow-[0_8px_30px_-12px_rgba(15,42,61,0.25)]' : 'bg-transparent'}`}>
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Navigation principale">
        <a href="#accueil" onClick={clicLien('accueil')} className="rounded-lg" aria-label="SmartDelivery Sénégal, retour en haut de la page">
          {defile || ouvert ? <Logo taille="sm" /> : <Logo taille="sm" sombre />}
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LIENS.map(({ ancre, libelle }) => (
            <li key={ancre}>
              <a href={`#${ancre}`} onClick={clicLien(ancre)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${defile ? 'text-slate-700 hover:bg-vert-50 hover:text-vert-600' : 'text-white/85 hover:bg-white/10 hover:text-white'}`}>
                {libelle}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/connexion" className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${defile ? 'text-marine-900 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
            Connexion
          </Link>
          <Link to="/inscription" className="rounded-lg bg-vert-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-vert-600">
            Inscription
          </Link>
        </div>

        <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} aria-controls="menu-mobile"
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          className={`rounded-lg p-2 lg:hidden ${defile || ouvert ? 'text-marine-900 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
          {ouvert ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {ouvert && (
        <div id="menu-mobile" className="border-t border-slate-100 bg-white px-4 pb-5 pt-2 lg:hidden">
          <ul className="space-y-1">
            {LIENS.map(({ ancre, libelle }) => (
              <li key={ancre}>
                <a href={`#${ancre}`} onClick={clicLien(ancre)} className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 hover:bg-vert-50">{libelle}</a>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/connexion" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-marine-900">Connexion</Link>
            <Link to="/inscription" className="rounded-lg bg-vert-500 px-4 py-2.5 text-center text-sm font-semibold text-white">Inscription</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function EnTete({ surtitre, titre, texte, clair = false }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={`text-sm font-bold uppercase tracking-[0.18em] ${clair ? 'text-vert-300' : 'text-vert-600'}`}>{surtitre}</p>
      <h2 className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl ${clair ? 'text-white' : 'text-marine-900'}`}>{titre}</h2>
      {texte && <p className={`mt-4 text-lg leading-relaxed ${clair ? 'text-slate-300' : 'text-slate-600'}`}>{texte}</p>}
    </div>
  );
}

function Heros() {
  return (
    <section id="accueil" className="relative overflow-hidden bg-marine-900 pb-20 pt-32 sm:pb-24 lg:pb-28 lg:pt-40">
      {/* Halo vert et motif discret */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-vert-500/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#1d4460] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-vert-200 ring-1 ring-white/15">
            <span className="h-2 w-2 rounded-full bg-vert-400" />Plateforme de livraison au Sénégal
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Vos livraisons en toute confiance <span className="text-vert-400">au Sénégal</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300 lg:mx-0">
            Commandez en quelques clics, suivez votre livreur en direct sur la carte et confirmez la réception.
            SmartDelivery réunit clients, livreurs et gestionnaires sur une seule plateforme.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link {...COMMANDER} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-vert-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-vert-500/30 transition hover:-translate-y-0.5 hover:bg-vert-600 sm:w-auto">
              <Package className="h-5 w-5" />Commander une livraison
            </Link>
            <Link to="/connexion" className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10 sm:w-auto">
              <LogIn className="h-5 w-5" />Se connecter
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-300">
            Pas encore de compte ? <Link to="/inscription" className="font-semibold text-vert-300 underline-offset-4 hover:underline">Créer un compte</Link>
          </p>
        </div>

        <div className="lg:pl-10">
          <ApercuSuivi />
        </div>
      </div>
    </section>
  );
}

function BandeAtouts() {
  return (
    <section aria-label="Les atouts de SmartDelivery" className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-8">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 shadow-[0_24px_60px_-30px_rgba(15,42,61,0.45)] ring-1 ring-slate-200 lg:grid-cols-4">
        {ATOUTS.map(({ icone: Icone, titre, texte }) => (
          <li key={titre} className="flex items-center gap-3 bg-white p-5 sm:gap-4 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vert-50 text-vert-500"><Icone className="h-5 w-5" /></span>
            <span>
              <span className="block font-bold text-marine-900">{titre}</span>
              <span className="block text-sm text-slate-500">{texte}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EnTete surtitre="Nos services" titre="Tout ce qu'il faut pour livrer et être livré"
          texte="De la commande à la confirmation de réception, chaque étape se fait dans l'application." />
        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icone: Icone, titre, texte }) => (
            <li key={titre} className="group rounded-2xl bg-white p-7 ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,42,61,0.45)] hover:ring-vert-200">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marine-900 text-white transition-colors group-hover:bg-vert-500">
                <Icone className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-marine-900">{titre}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{texte}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Illustration : le parcours d'une commande, avec les libellés réellement affichés dans l'application
const CYCLE = ['Commande créée', 'Commande validée', 'Livreur affecté', 'Livraison acceptée', 'Colis en route', 'Colis livré', 'Réception confirmée'];
function CycleCommande() {
  const actif = 4;
  return (
    <div aria-hidden="true" className="relative mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-[0_30px_60px_-30px_rgba(15,42,61,0.5)] sm:p-7">
      <div className="flex items-center justify-between">
        <p className="font-bold text-marine-900">Historique de la commande</p>
        <span className="rounded-full bg-vert-50 px-2.5 py-1 text-xs font-semibold text-vert-600">En cours</span>
      </div>
      <ol className="mt-5">
        {CYCLE.map((etape, i) => (
          <li key={etape} className="relative flex gap-3 pb-4 last:pb-0">
            {i < CYCLE.length - 1 && <span className={`absolute left-[0.6875rem] top-6 h-[calc(100%-1rem)] w-0.5 ${i < actif ? 'bg-vert-500' : 'bg-slate-200'}`} />}
            {i < actif ? <CircleCheck className="relative h-6 w-6 shrink-0 text-vert-500" />
              : i === actif ? <span className="relative flex h-6 w-6 shrink-0 items-center justify-center"><span className="h-3 w-3 rounded-full bg-vert-500 ring-[5px] ring-vert-100" /></span>
                : <span className="relative flex h-6 w-6 shrink-0 items-center justify-center"><span className="h-3 w-3 rounded-full border-2 border-slate-300 bg-white" /></span>}
            <span className={`pt-0.5 text-sm ${i === actif ? 'font-bold text-marine-900' : i < actif ? 'text-slate-700' : 'text-slate-500'}`}>
              {etape}{i === actif && <span className="ml-2 font-medium text-vert-600">· livreur visible sur la carte</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Suivi() {
  const points = [
    { icone: Navigation, titre: 'Position en direct', texte: 'La carte se met à jour pendant toute la course.' },
    { icone: Clock, titre: 'Chaque étape horodatée', texte: 'Validation, affectation, départ, livraison : vous savez quand.' },
    { icone: Bell, titre: 'Notifications', texte: 'Vous êtes prévenu à chaque changement de statut.' },
    { icone: Star, titre: 'Confirmation et note', texte: 'Vous confirmez la réception et notez votre livreur.' },
  ];
  return (
    <section aria-labelledby="titre-suivi" className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#ecfbf1_0%,#d3f5de_100%)] p-8 sm:p-12">
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/60" />
            <CycleCommande />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-vert-600">Suivi des commandes</p>
          <h2 id="titre-suivi" className="mt-3 text-3xl font-extrabold tracking-tight text-marine-900 sm:text-4xl">Fini les appels pour savoir où est votre colis</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Dès que le livreur démarre, sa position est partagée automatiquement. Vous suivez le trajet sur la carte, du départ jusqu'à votre porte.
          </p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {points.map(({ icone: Icone, titre, texte }) => (
              <li key={titre} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vert-50 text-vert-500"><Icone className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold text-marine-900">{titre}</span>
                  <span className="block text-sm leading-relaxed text-slate-600">{texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Fonctionnement() {
  return (
    <section id="fonctionnement" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EnTete surtitre="Comment ça marche" titre="Votre livraison en trois étapes" texte="Simple pour le client, efficace pour le livreur." />
        <ol className="relative mt-16 grid gap-10 lg:grid-cols-3 lg:gap-8">
          <div aria-hidden="true" className="absolute left-[16.6%] right-[16.6%] top-9 hidden border-t-2 border-dashed border-vert-300 lg:block" />
          {ETAPES.map(({ icone: Icone, titre, texte }, i) => (
            <li key={titre} className="relative text-center">
              <span className="relative mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-vert-500 text-white shadow-lg shadow-vert-500/30 ring-8 ring-fond">
                <Icone className="h-8 w-8" />
                <span className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-marine-900 text-sm font-bold text-white">{i + 1}</span>
              </span>
              <h3 className="mt-6 text-xl font-bold text-marine-900">{titre}</h3>
              <p className="mx-auto mt-2 max-w-xs leading-relaxed text-slate-600">{texte}</p>
            </li>
          ))}
        </ol>
        <div className="mt-14 text-center">
          <Link {...COMMANDER} className="inline-flex items-center gap-2 rounded-xl bg-marine-900 px-6 py-3.5 font-semibold text-white transition hover:bg-[#1d4460]">
            Commander une livraison<ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Avantages() {
  return (
    <section aria-labelledby="titre-avantages" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-vert-600">Les avantages</p>
          <h2 id="titre-avantages" className="mt-3 text-3xl font-extrabold tracking-tight text-marine-900 sm:text-4xl">Une plateforme, trois espaces</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">Chacun dispose d'un espace sécurisé, adapté à son rôle.</p>
        </div>
        <ul className="mt-14 grid gap-6 lg:grid-cols-3">
          {PUBLICS.map(({ icone: Icone, titre, points }, i) => (
            <li key={titre} className={`rounded-2xl p-8 ${i === 1 ? 'bg-marine-900 text-white' : 'bg-fond ring-1 ring-slate-200'}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${i === 1 ? 'bg-vert-500 text-white' : 'bg-white text-vert-500 ring-1 ring-slate-200'}`}>
                <Icone className="h-6 w-6" />
              </span>
              <h3 className={`mt-5 text-xl font-bold ${i === 1 ? 'text-white' : 'text-marine-900'}`}>{titre}</h3>
              <ul className="mt-5 space-y-3">
                {points.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <BadgeCheck className={`mt-0.5 h-5 w-5 shrink-0 ${i === 1 ? 'text-vert-400' : 'text-vert-500'}`} />
                    <span className={i === 1 ? 'text-slate-200' : 'text-slate-700'}>{p}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl bg-vert-50 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left lg:px-10">
          <p className="flex items-center gap-3 font-semibold text-marine-900">
            <Route className="h-6 w-6 shrink-0 text-vert-500" />Zones desservies
          </p>
          <ul className="flex flex-wrap justify-center gap-2 sm:justify-end">
            {ZONES.map((z) => (
              <li key={z} className="rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-marine-900 ring-1 ring-vert-200">{z}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function APropos() {
  const valeurs = [
    { icone: ShieldCheck, titre: 'Sécurité', texte: 'Comptes protégés, mots de passe jamais stockés en clair, accès limité selon le rôle.' },
    { icone: Smartphone, titre: 'Accessible', texte: 'Utilisable sur ordinateur comme sur téléphone, sans application à installer.' },
    { icone: ChartColumn, titre: 'Mesurable', texte: 'Chaque étape est enregistrée pour mesurer et améliorer la qualité du service.' },
  ];
  return (
    <section id="a-propos" className="scroll-mt-20 relative overflow-hidden bg-marine-900 py-20 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-vert-500/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-vert-300">À propos</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Une plateforme pensée pour la livraison au Sénégal</h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Au Sénégal, beaucoup de livraisons s'organisent encore par téléphone, avec des adresses approximatives et sans suivi.
            SmartDelivery Sénégal apporte une réponse simple : placer les adresses sur une carte, suivre chaque course en direct
            et transformer chaque livraison en données utiles pour améliorer le service.
          </p>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Projet de fin de formation réalisé par le groupe 13 de la filière Analyse de Performance Digitale
            de l'ISEP Amadou Trawaré de Diamniadio, sous l'encadrement de M. Demba Diack.
          </p>
        </div>
        <ul className="grid gap-4">
          {valeurs.map(({ icone: Icone, titre, texte }) => (
            <li key={titre} className="flex gap-4 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-vert-500 text-white"><Icone className="h-6 w-6" /></span>
              <span>
                <span className="block text-lg font-bold text-white">{titre}</span>
                <span className="mt-1 block leading-relaxed text-slate-300">{texte}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AppelAction() {
  return (
    <section aria-labelledby="titre-appel" className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-vert-500 px-6 py-14 text-center sm:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-marine-900/20" />
        <h2 id="titre-appel" className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Prêt à faire livrer votre premier colis ?</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-white">Créez votre compte en quelques minutes, ou rejoignez nos livreurs partenaires.</p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/inscription" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-vert-600 transition hover:bg-vert-50">
            <UserPlus className="h-5 w-5" />Créer un compte client
          </Link>
          <Link to="/inscription?profil=livreur" className="inline-flex items-center justify-center gap-2 rounded-xl bg-marine-900 px-6 py-3.5 font-semibold text-white transition hover:bg-[#1d4460]">
            <Bike className="h-5 w-5" />Devenir livreur
          </Link>
        </div>
      </div>
    </section>
  );
}

function PiedDePage() {
  const titre = 'text-sm font-bold uppercase tracking-wider text-white';
  const lien = 'text-slate-300 transition-colors hover:text-vert-300';
  return (
    <footer className="bg-[#0a1f2e] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Logo sombre />
          <p className="mt-4 max-w-xs leading-relaxed text-slate-300">Livraison rapide, intelligente et sécurisée, de la commande à la réception.</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><MapPin className="h-4 w-4 text-vert-400" />Diamniadio, Sénégal</p>
          <a href={`mailto:${EMAIL_CONTACT}`} className="mt-2 flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-vert-300">
            <Mail className="h-4 w-4 text-vert-400" aria-hidden="true" />{EMAIL_CONTACT}
          </a>
        </div>
        <div>
          <p className={titre}>Navigation</p>
          <ul className="mt-4 space-y-2.5">
            {LIENS.map(({ ancre, libelle }) => (
              <li key={ancre}><a href={`#${ancre}`} onClick={(e) => allerA(ancre, e)} className={lien}>{libelle}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className={titre}>Espaces</p>
          <ul className="mt-4 space-y-2.5">
            <li><Link {...COMMANDER} className={lien}>Commander une livraison</Link></li>
            <li><Link to="/inscription?profil=livreur" className={lien}>Devenir livreur</Link></li>
            <li><Link to="/connexion" className={lien}>Se connecter</Link></li>
            <li><Link to="/inscription" className={lien}>Créer un compte</Link></li>
          </ul>
        </div>
        <div>
          <p className={titre}>Informations</p>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/conditions" className={lien}>Conditions d'utilisation</Link></li>
            <li><Link to="/confidentialite" className={lien}>Politique de confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-center text-sm text-slate-300 sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p className="flex items-center gap-2"><LogoMarque className="h-6 w-6" pastille />© 2026 SmartDelivery Sénégal. Tous droits réservés.</p>
          <p>Projet de fin de formation · ISEP Amadou Trawaré de Diamniadio</p>
        </div>
      </div>
    </footer>
  );
}

export default function Accueil() {
  // Ouverture directe sur une ancre (ex. /#services) : se placer sur la section
  useEffect(() => {
    const ancre = window.location.hash.slice(1);
    if (ancre) document.getElementById(ancre)?.scrollIntoView();
  }, []);

  return (
    <div className="min-h-screen bg-fond">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-marine-900">
        Aller au contenu
      </a>
      <BarreNavigation />
      <main id="contenu">
        <Heros />
        <BandeAtouts />
        <Services />
        <Suivi />
        <Fonctionnement />
        <Avantages />
        <APropos />
        <AppelAction />
      </main>
      <PiedDePage />
    </div>
  );
}
