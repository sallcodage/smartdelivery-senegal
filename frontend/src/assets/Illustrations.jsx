// Illustrations vectorielles (aucune image externe : l'application fonctionne hors ligne).
// Pour utiliser la photo du prototype, placez-la dans public/images/ et remplacez <IllustrationLivreur />.

export function IllustrationLivreur({ className = '' }) {
  return (
    <svg viewBox="0 0 480 360" className={className} role="img" aria-label="Livreur SmartDelivery à scooter devant Dakar">
      <defs>
        <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecfbf1" />
          <stop offset="1" stopColor="#d3f5de" />
        </linearGradient>
      </defs>
      <rect width="480" height="360" fill="url(#ciel)" />
      <circle cx="390" cy="70" r="34" fill="#fde68a" opacity=".7" />
      {/* Silhouette urbaine de Dakar et baobab, arbre emblématique du Sénégal */}
      <g fill="#a7eabf">
        <rect x="18" y="150" width="34" height="120" rx="2" /><rect x="58" y="118" width="26" height="152" rx="2" />
        <rect x="90" y="168" width="44" height="102" rx="2" /><rect x="140" y="138" width="30" height="132" rx="2" />
        <rect x="318" y="158" width="38" height="112" rx="2" /><rect x="362" y="130" width="28" height="140" rx="2" />
        <rect x="396" y="176" width="66" height="94" rx="2" />
        <path d="M222 270 c8-30 10-62 8-96 h24 c-2 34 0 66 8 96 z" />
        <path d="M232 178 c-10-14-26-18-40-14 M252 178 c10-16 28-20 44-14 M242 176 c0-14 2-26 8-36" stroke="#a7eabf" strokeWidth="9" strokeLinecap="round" fill="none" />
        <ellipse cx="186" cy="160" rx="30" ry="18" /><ellipse cx="298" cy="160" rx="32" ry="18" />
        <ellipse cx="250" cy="134" rx="34" ry="20" /><ellipse cx="222" cy="146" rx="22" ry="14" />
      </g>
      <g fill="#6fd898" opacity=".55">
        <rect x="24" y="162" width="6" height="8" /><rect x="36" y="162" width="6" height="8" /><rect x="24" y="182" width="6" height="8" />
        <rect x="64" y="130" width="6" height="8" /><rect x="74" y="130" width="6" height="8" /><rect x="368" y="142" width="6" height="8" />
        <rect x="378" y="142" width="6" height="8" /><rect x="404" y="188" width="8" height="8" /><rect x="420" y="188" width="8" height="8" />
      </g>
      {/* Route */}
      <path d="M0 270 H480 V360 H0 Z" fill="#334155" />
      <path d="M0 312 H480" stroke="#f8fafc" strokeWidth="5" strokeDasharray="28 22" />
      {/* Scooter */}
      <g transform="translate(150 150)">
        <circle cx="40" cy="150" r="26" fill="#0f172a" /><circle cx="40" cy="150" r="11" fill="#cbd5e1" />
        <circle cx="200" cy="150" r="26" fill="#0f172a" /><circle cx="200" cy="150" r="11" fill="#cbd5e1" />
        <path d="M18 132 q6-30 44-32 h70 l30 32 z" fill="#16a34a" />
        <path d="M150 132 l24-58 h22" stroke="#0f172a" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M168 112 q30 6 40 36 h-44z" fill="#106c33" />
        {/* Caisse de livraison */}
        <rect x="6" y="36" width="76" height="62" rx="8" fill="#12883d" />
        <rect x="6" y="36" width="76" height="14" rx="6" fill="#0f552b" />
        <circle cx="44" cy="72" r="14" fill="#fff" />
        <path d="M44 62 c-6 0-10 4-10 9 0 7 10 14 10 14s10-7 10-14c0-5-4-9-10-9z" fill="#16a34a" />
        {/* Livreur */}
        <path d="M96 128 l-6-54 q2-20 26-22 l24 2 q18 4 20 24 l2 20 -24 6 z" fill="#16a34a" />
        <path d="M150 70 l30 26" stroke="#16a34a" strokeWidth="16" strokeLinecap="round" />
        <path d="M100 126 l54 0 12 28" stroke="#1e293b" strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="128" cy="26" r="22" fill="#0f552b" />
        <path d="M108 26 a20 20 0 0 1 40 0 z" fill="#16a34a" />
        <rect x="126" y="24" width="24" height="10" rx="5" fill="#0f172a" opacity=".85" />
      </g>
    </svg>
  );
}

export function IllustrationEnveloppe({ className = '' }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <ellipse cx="100" cy="132" rx="70" ry="10" fill="#d3f5de" />
      <rect x="40" y="46" width="120" height="80" rx="10" fill="#16a34a" />
      <path d="M40 56 l60 42 60-42" fill="none" stroke="#a7eabf" strokeWidth="5" strokeLinejoin="round" />
      <rect x="62" y="18" width="76" height="58" rx="6" fill="#fff" stroke="#d3f5de" strokeWidth="3" />
      <path d="M74 36 h52 M74 48 h40" stroke="#a7eabf" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 126 l46-38 M160 126 l-46-38" stroke="#12883d" strokeWidth="5" strokeLinecap="round" />
      <circle cx="150" cy="40" r="16" fill="#fde68a" />
      <path d="M150 32 v9 m0 6 v1" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
