import { useId } from 'react';

// Logo emblème SmartDelivery (maquette des pages d'accès) :
// épingle bleu marine, colis vert en perspective, flèche verte en arc (rapidité, suivi).
export function Embleme({ className = 'h-20 w-20' }) {
  // Identifiants uniques : plusieurs logos peuvent coexister sur la page (dont un masqué)
  const id = useId().replace(/:/g, '');
  const epingle = `emb-epingle-${id}`;
  const fleche = `emb-fleche-${id}`;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={epingle} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d4460" />
          <stop offset="1" stopColor="#0f2a3d" />
        </linearGradient>
        <linearGradient id={fleche} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#12873d" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      {/* Épingle */}
      <path d="M60 114c-5-8-31-33-31-60a31 31 0 0 1 62 0c0 27-26 52-31 60z" fill={`url(#${epingle})`} />
      <circle cx="60" cy="52" r="21" fill="#0f2a3d" opacity=".35" />
      {/* Colis en perspective */}
      <path d="M60 30l17 8.5-17 8.5-17-8.5z" fill="#4ade80" />
      <path d="M43 38.5l17 8.5v20l-17-8.5z" fill="#16a34a" />
      <path d="M77 38.5l-17 8.5v20l17-8.5z" fill="#12873d" />
      <path d="M51.5 34.3l17 8.5v5.5" fill="none" stroke="#0f2a3d" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
      {/* Flèche en arc autour de l'épingle */}
      <path d="M14 66c10 22 46 30 72 10 9-7 15-15 19-24" fill="none" stroke={`url(#${fleche})`} strokeWidth="7" strokeLinecap="round" />
      <path d="M95 44l16-7-2 17z" fill="#22c55e" />
    </svg>
  );
}

const nom = (taille) => (
  <span className={`${taille} font-extrabold tracking-tight`}>
    <span className="text-marine-900">Smart</span><span className="text-vert-500">Delivery</span>
  </span>
);

// Logo empilé (carte de connexion / d'inscription)
export function MarqueEmpilee() {
  return (
    <div className="flex flex-col items-center">
      <Embleme className="h-[4.5rem] w-[4.5rem] xl:h-24 xl:w-24" />
      <p className="mt-1 leading-none">{nom('text-[1.75rem] xl:text-[2.1rem]')}</p>
      <p className="mt-1 text-lg font-medium text-marine-900 xl:text-xl">Sénégal</p>
    </div>
  );
}

// Logo horizontal avec signature (panneau photo)
export function MarqueHorizontale({ compacte = false }) {
  return (
    <div className="flex items-center gap-3">
      <Embleme className={compacte ? 'h-[clamp(4rem,6vw,6rem)] w-[clamp(4rem,6vw,6rem)] shrink-0' : 'h-[clamp(5.5rem,8.6vw,8.5rem)] w-[clamp(5.5rem,8.6vw,8.5rem)] shrink-0'} />
      <div className="leading-tight">
        <p className="leading-none">{nom(compacte ? 'text-[clamp(1.8rem,2.6vw,2.6rem)]' : 'text-[clamp(2.4rem,3.6vw,3.6rem)]')}</p>
        <p className={`${compacte ? 'text-[clamp(1.2rem,1.7vw,1.7rem)]' : 'text-[clamp(1.6rem,2.4vw,2.4rem)]'} font-medium text-marine-900`}>Sénégal</p>
        <p className={`mt-1 ${compacte ? 'text-sm xl:text-base' : 'text-[clamp(1rem,1.3vw,1.3rem)]'} text-marine-900`}>Livraison rapide, intelligente et sécurisée</p>
      </div>
    </div>
  );
}
