import { CheckCircle2, Info, XCircle, AlertTriangle } from 'lucide-react';
import { initiales } from '../../utils/format';
import { urlFichier } from '../../api/client';

export function Carte({ children, className = '', ...props }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`} {...props}>{children}</section>;
}

const TONS = {
  vert: 'bg-vert-50 text-vert-700 ring-vert-600/20',
  bleu: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  orange: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rouge: 'bg-red-50 text-red-700 ring-red-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  gris: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};
export function Badge({ ton = 'gris', children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONS[ton]}`}>{children}</span>;
}

export function Avatar({ utilisateur, taille = 'md' }) {
  const t = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-2xl' }[taille];
  if (utilisateur?.photoUrl) {
    return <img src={urlFichier(utilisateur.photoUrl)} alt="" className={`${t} shrink-0 rounded-full object-cover ring-2 ring-white`} />;
  }
  return (
    <span className={`${t} inline-flex shrink-0 items-center justify-center rounded-full bg-vert-100 font-semibold text-vert-700 ring-2 ring-white`} aria-hidden="true">
      {initiales(utilisateur)}
    </span>
  );
}

const ALERTES = {
  succes: { classe: 'border-vert-200 bg-vert-50 text-vert-800', Icone: CheckCircle2 },
  erreur: { classe: 'border-red-200 bg-red-50 text-red-800', Icone: XCircle },
  info: { classe: 'border-blue-200 bg-blue-50 text-blue-800', Icone: Info },
  avertissement: { classe: 'border-amber-200 bg-amber-50 text-amber-800', Icone: AlertTriangle },
};
export function Alerte({ type = 'info', children }) {
  const { classe, Icone } = ALERTES[type];
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${classe}`} role={type === 'erreur' ? 'alert' : 'status'}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function EnTetePage({ titre, sousTitre, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-slate-500">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Interrupteur({ actif, onChange, label, disabled, surFondVert = false }) {
  return (
    <button
      type="button" role="switch" aria-checked={actif} aria-label={label} disabled={disabled} onClick={() => onChange(!actif)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${actif ? (surFondVert ? 'bg-nuit-800' : 'bg-vert-500') : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}
