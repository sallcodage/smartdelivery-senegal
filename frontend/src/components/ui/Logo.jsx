// Logo SmartDelivery : épingle verte + livreur, repris du prototype
export function LogoMarque({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 3C19 3 8.5 13.3 8.5 26.1 8.5 43.6 32 61 32 61s23.5-17.4 23.5-34.9C55.5 13.3 45 3 32 3z" fill="#16a34a" />
      <circle cx="32" cy="26" r="15" fill="#fff" />
      <rect x="22.5" y="17.5" width="9" height="8" rx="1.8" fill="#16a34a" />
      <path d="M22 31h12l3.5-7.5H42" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24.5" cy="34" r="3.2" fill="#16a34a" />
      <circle cx="39.5" cy="34" r="3.2" fill="#16a34a" />
    </svg>
  );
}

export default function Logo({ sombre = false, taille = 'md', sousTitre = 'Sénégal' }) {
  const dimensions = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }[taille];
  const texte = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[taille];
  return (
    <div className="flex items-center gap-2.5">
      <LogoMarque className={dimensions} />
      <div className="leading-tight">
        <p className={`${texte} font-bold tracking-tight ${sombre ? 'text-white' : 'text-slate-900'}`}>
          Smart<span className={sombre ? 'text-vert-400' : 'text-vert-500'}>Delivery</span>
        </p>
        {sousTitre && <p className={`text-xs ${sombre ? 'text-vert-200/80' : 'text-slate-500'}`}>{sousTitre}</p>}
      </div>
    </div>
  );
}
