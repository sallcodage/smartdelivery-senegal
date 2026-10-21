import { Bike, CircleCheck, MapPin, Package } from 'lucide-react';

// Illustration de la page d'accueil : un téléphone qui montre le suivi d'une livraison.
// Purement décorative (aria-hidden) : aucun chiffre ni aucune donnée réelle n'y figure.
const ETAPES = [
  { libelle: 'Commande validée', fait: true },
  { libelle: 'Livreur affecté', fait: true },
  { libelle: 'En cours de livraison', actif: true },
  { libelle: 'Livrée', fait: false },
];

function CarteStylisee() {
  return (
    <svg viewBox="0 0 280 230" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="280" height="230" fill="#eef3ef" />
      {/* Îlots et mer */}
      <path d="M0 175c40-12 70-6 110 6s90 18 170-4v53H0z" fill="#cfe8f7" />
      <rect x="18" y="20" width="70" height="46" rx="6" fill="#e2ebe4" />
      <rect x="110" y="14" width="64" height="58" rx="6" fill="#e2ebe4" />
      <rect x="196" y="24" width="66" height="40" rx="6" fill="#dcefe2" />
      <rect x="24" y="92" width="58" height="52" rx="6" fill="#dcefe2" />
      <rect x="196" y="88" width="68" height="60" rx="6" fill="#e2ebe4" />
      {/* Rues */}
      <path d="M0 80h280M100 0v175M186 0v175M0 150c60-6 120 4 280-6" stroke="#fff" strokeWidth="9" fill="none" />
      <path d="M40 0l52 175M240 0l-40 175" stroke="#fff" strokeWidth="5" fill="none" />
      {/* Trajet */}
      <path d="M58 52C80 80 96 96 128 104" stroke="#12873d" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M128 104c30 8 52 20 74 46" stroke="#12873d" strokeWidth="4" strokeDasharray="1 8" strokeLinecap="round" fill="none" />
      {/* Départ */}
      <circle cx="58" cy="52" r="9" fill="#12873d" stroke="#fff" strokeWidth="3" />
      {/* Arrivée */}
      <path d="M202 162c-3-5-14-15-14-25a14 14 0 0 1 28 0c0 10-11 20-14 25z" fill="#0f2a3d" />
      <circle cx="202" cy="137" r="5" fill="#fff" />
    </svg>
  );
}

export default function ApercuSuivi() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[22rem] select-none">
      {/* Téléphone */}
      <div className="relative rounded-[2.4rem] bg-marine-900 p-2.5 shadow-[0_40px_80px_-30px_rgba(6,17,11,0.75)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.9rem] bg-white">
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <span className="text-[0.7rem] font-semibold text-marine-900">Suivi de la commande</span>
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[0.65rem] font-semibold text-red-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />En direct
            </span>
          </div>
          <div className="relative h-48">
            <CarteStylisee />
            {/* Livreur qui avance sur le trajet */}
            <span className="absolute left-[44%] top-[40%] flex h-9 w-9 items-center justify-center rounded-full bg-vert-500 text-white shadow-lg ring-4 ring-white">
              <Bike className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="space-y-3 px-5 pb-5 pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vert-50 text-vert-500"><Package className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-bold text-marine-900">Votre colis est en route</p>
                <p className="text-xs text-slate-500">Position du livreur mise à jour en continu</p>
              </div>
            </div>
            <ol className="space-y-1.5 border-t border-slate-100 pt-3">
              {ETAPES.map(({ libelle, fait, actif }) => (
                <li key={libelle} className="flex items-center gap-2 text-xs">
                  {fait ? <CircleCheck className="h-4 w-4 text-vert-500" />
                    : actif ? <span className="flex h-4 w-4 items-center justify-center"><span className="h-2.5 w-2.5 rounded-full bg-vert-500 ring-4 ring-vert-100" /></span>
                      : <span className="flex h-4 w-4 items-center justify-center"><span className="h-2.5 w-2.5 rounded-full border-2 border-slate-300" /></span>}
                  <span className={actif ? 'font-semibold text-marine-900' : fait ? 'text-slate-600' : 'text-slate-400'}>{libelle}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Bulles flottantes */}
      <div className="absolute -left-6 top-16 hidden rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-200/70 sm:block lg:-left-16">
        <p className="flex items-center gap-2 text-xs font-semibold text-marine-900"><MapPin className="h-4 w-4 text-vert-500" />Livreur le plus proche</p>
        <p className="mt-0.5 text-[0.7rem] text-slate-500">affecté à votre commande</p>
      </div>
      <div className="absolute -right-4 top-20 hidden rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-200/70 sm:block lg:-right-12">
        <p className="flex items-center gap-2 text-xs font-semibold text-marine-900"><CircleCheck className="h-4 w-4 text-vert-500" />Prix connu à l'avance</p>
        <p className="mt-0.5 text-[0.7rem] text-slate-500">calculé selon la distance</p>
      </div>
    </div>
  );
}
