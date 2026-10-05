import { MarqueHorizontale } from '../components/ui/LogoEmbleme';
import fondConnexion from '../assets/connexion/fond-connexion-1536.webp';
import fondConnexionMobile from '../assets/connexion/fond-connexion-800.webp';

// ─────────────────────────────────────────────────────────────────────
//  Pages d'accès (maquette « Connexion SmartDelivery au Sénégal »)
//  Ordinateur : photo de Dakar à gauche (bord droit en vague) avec logo,
//  titre et atouts ; carte blanche flottante à droite ; vagues vertes.
//  Mobile : bandeau photo puis carte en feuille blanche arrondie.
// ─────────────────────────────────────────────────────────────────────
// Icônes pleines, comme sur la maquette
const IconeCamion = (p) => (
  <svg viewBox="0 0 32 32" {...p}><path d="M2 9h4M1 13h5M3 17h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 8h13v14H8zM21 12h5l4 5v5h-9z" fill="currentColor" /><circle cx="12" cy="23.5" r="3" fill="#fff" stroke="currentColor" strokeWidth="2" />
    <circle cx="25" cy="23.5" r="3" fill="#fff" stroke="currentColor" strokeWidth="2" /><path d="M23 14h3l2 3h-5z" fill="#fff" /></svg>
);
const IconeBouclier = (p) => (
  <svg viewBox="0 0 32 32" {...p}><path d="M16 2l11 4v9c0 7-5 12-11 15C10 27 5 22 5 15V6z" fill="currentColor" />
    <path d="M11 16l3.5 3.5L21.5 12" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconeGraphique = (p) => (
  <svg viewBox="0 0 32 32" {...p}><rect x="5" y="17" width="5.5" height="10" rx="1.2" fill="currentColor" />
    <rect x="13.25" y="11" width="5.5" height="16" rx="1.2" fill="currentColor" /><rect x="21.5" y="5" width="5.5" height="22" rx="1.2" fill="currentColor" /></svg>
);

const ATOUTS = [
  { icone: IconeCamion, libelle: ['Livraison', 'rapide'] },
  { icone: IconeBouclier, libelle: ['Suivi en', 'temps réel'] },
  { icone: IconeGraphique, libelle: ['Service', 'fiable'] },
];

const VARIANTES = {
  connexion: {
    // La carte recouvre le bord droit du panneau photo, comme sur la maquette
    photo: 'lg:w-[72%]',
    zone: 'lg:w-[44%] lg:items-center',
    carte: 'max-w-[33rem] xl:max-w-[37rem]',
    // Livreur, ville, Monument de la Renaissance et carte du Sénégal à gauche de la carte
    cadrage: 'lg:object-[60%_center]',
    titre: 'text-[clamp(2.4rem,3.8vw,3.75rem)]',
    banniere: 'h-[34vh] min-h-56 sm:h-[38vh]',
  },
  inscription: {
    photo: 'lg:w-[52%]',
    zone: 'lg:w-[54%] lg:items-start',
    carte: 'max-w-[46rem]',
    cadrage: 'lg:object-[22%_center]',
    titre: 'text-[clamp(2rem,2.9vw,2.9rem)]',
    banniere: 'h-[24vh] min-h-44 sm:h-[28vh]',
  },
};

// Bord droit de la photo en vague (couleur du fond de page)
function BordVague() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 1000" preserveAspectRatio="none" className="absolute inset-y-0 right-0 hidden h-full w-[16%] lg:block">
      <path d="M100 0H70C28 140 22 300 52 430c26 115 44 260-14 420C26 900 14 950 0 1000h100z" fill="#f5f8fa" />
    </svg>
  );
}

// Ruban vert en bas de la photo
function RubanVert() {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 220" preserveAspectRatio="none" className="absolute bottom-0 right-0 hidden h-[24%] w-[62%] lg:block">
      <defs>
        <linearGradient id="ruban-auth" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#12873d" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <path d="M0 220C150 200 300 150 420 80 480 45 540 20 600 8V220z" fill="url(#ruban-auth)" />
      <path d="M0 220C150 200 300 150 420 80 480 45 540 20 600 8" fill="none" stroke="#fff" strokeWidth="6" opacity=".9" />
    </svg>
  );
}

// Vagues décoratives du fond, en bas à droite
function FondVagues() {
  return (
    <svg aria-hidden="true" viewBox="0 0 700 520" preserveAspectRatio="none" className="pointer-events-none fixed bottom-0 right-0 hidden h-[48vh] w-[42vw] lg:block">
      <path d="M700 40C560 160 470 300 330 400 230 470 120 500 0 520h700z" fill="#22c55e" opacity=".12" />
      <path d="M700 200C600 300 520 380 400 440 300 490 200 510 120 520h580z" fill="#16a34a" opacity=".16" />
    </svg>
  );
}

export default function AuthLayout({ variante = 'connexion', children }) {
  const v = VARIANTES[variante] || VARIANTES.connexion;
  return (
    <div className="relative min-h-screen bg-white lg:bg-[#f5f8fa]">
      <FondVagues />

      {/* Photo : bandeau sur mobile, panneau fixe sur ordinateur */}
      {/* Sur ordinateur, la photo occupe les 80 % inférieurs ; le haut est un ciel en dégradé
          qui rejoint exactement celui de la photo (logo et titre posés sur le ciel) */}
      <section aria-label="SmartDelivery Sénégal" className={`relative overflow-hidden lg:fixed lg:inset-y-0 lg:left-0 lg:bg-[linear-gradient(180deg,#e8f4fe_0%,#b5defe_11%,#7bc6fd_20%)] ${v.photo}`}>
        <img
          src={fondConnexion}
          srcSet={`${fondConnexionMobile} 800w, ${fondConnexion} 1536w`}
          sizes="(min-width: 1024px) 60vw, 100vw"
          alt="" aria-hidden="true" fetchPriority="high" decoding="async"
          className={`${v.banniere} ${v.cadrage} w-full object-cover object-[24%_66%] lg:absolute lg:bottom-0 lg:left-0 lg:h-[80%] lg:min-h-0`}
        />
        {/* Raccord invisible entre le ciel en dégradé et le haut de la photo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[20%] hidden h-[9%] bg-gradient-to-b from-[#7bc6fd] to-transparent lg:block" />
        {/* Voile clair en haut seulement : texte bleu marine lisible, livreur et ville intacts */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.45)_30%,rgba(255,255,255,0.14)_48%,rgba(255,255,255,0)_58%)] lg:block" />
        <BordVague />
        <RubanVert />

        <div className="absolute inset-x-0 top-0 hidden px-[5.5%] pt-[5vh] lg:block">
          <MarqueHorizontale compacte={variante !== 'connexion'} />
          <p className={`mt-[4.5vh] font-extrabold leading-[1.06] tracking-tight text-marine-900 ${v.titre} [@media(max-height:840px)]:text-[clamp(2rem,3vw,2.6rem)]`}>
            Vos livraisons<br />en toute confiance<br /><span className="text-vert-500">au Sénégal</span>
          </p>
          {/* Écrans peu hauts (portables 768 px) : atouts masqués pour ne pas chevaucher le livreur */}
          <ul className="mt-[3.5vh] flex items-start [@media(max-height:840px)]:hidden">
            {ATOUTS.map(({ icone: Icone, libelle }, i) => (
              <li key={libelle.join(' ')} className={`flex w-32 flex-col items-center text-center xl:w-40 ${i ? 'border-l border-marine-900/20' : ''}`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-vert-500 shadow-[0_8px_20px_-6px_rgba(15,42,61,0.35)] xl:h-20 xl:w-20">
                  <Icone className="h-8 w-8 xl:h-10 xl:w-10" aria-hidden="true" />
                </span>
                <span className="mt-3 text-base font-semibold leading-snug text-marine-900 [text-shadow:0_0_10px_rgba(255,255,255,0.95)] xl:text-lg">
                  {libelle[0]}<br />{libelle[1]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Carte du formulaire */}
      <main className={`relative -mt-8 lg:ml-auto lg:mt-0 lg:flex lg:min-h-screen lg:justify-center lg:px-[3vw] lg:py-10 ${v.zone}`}>
        <div className={`mx-auto w-full rounded-t-[1.75rem] bg-white px-5 pb-12 pt-9 sm:px-8 lg:rounded-[1.75rem] lg:px-12 lg:py-11 xl:px-14 xl:py-14 lg:[@media(max-height:840px)]:py-8 lg:shadow-[0_30px_70px_-28px_rgba(15,42,61,0.35)] lg:ring-1 lg:ring-slate-200/70 ${v.carte}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
