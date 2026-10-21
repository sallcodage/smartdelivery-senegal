import { Embleme } from './LogoEmbleme';

// Logo SmartDelivery : un seul emblème pour toute l'application
// (épingle bleu marine, colis vert, flèche en arc), le même que sur les pages d'accès.
// Sur fond sombre (menu latéral), l'emblème est posé sur une pastille blanche pour rester lisible.
export function LogoMarque({ className = 'h-10 w-10', pastille = false }) {
  if (!pastille) return <Embleme className={className} />;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-0.5 ${className}`}>
      <Embleme className="h-full w-full" />
    </span>
  );
}

export default function Logo({ sombre = false, taille = 'md', sousTitre = 'Sénégal' }) {
  const dimensions = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-14 w-14' }[taille];
  const texte = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[taille];
  return (
    <div className="flex items-center gap-2.5">
      <LogoMarque className={dimensions} pastille={sombre} />
      <div className="leading-tight">
        <p className={`${texte} font-bold tracking-tight ${sombre ? 'text-white' : 'text-marine-900'}`}>
          Smart<span className={sombre ? 'text-vert-400' : 'text-vert-500'}>Delivery</span>
        </p>
        {sousTitre && <p className={`text-xs ${sombre ? 'text-vert-200/80' : 'text-slate-500'}`}>{sousTitre}</p>}
      </div>
    </div>
  );
}
