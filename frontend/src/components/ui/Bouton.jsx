import { Loader2 } from 'lucide-react';

const VARIANTES = {
  primaire: 'bg-vert-500 text-white hover:bg-vert-600 disabled:bg-vert-300',
  secondaire: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  fantome: 'text-slate-600 hover:bg-slate-100',
  lien: 'text-vert-600 hover:text-vert-700 hover:underline px-0 py-0',
};
const TAILLES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-base' };

export default function Bouton({
  children, variante = 'primaire', taille = 'md', chargement = false, icone: Icone,
  pleineLargeur = false, className = '', type = 'button', ...props
}) {
  return (
    <button
      type={type}
      disabled={chargement || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors
        disabled:cursor-not-allowed ${VARIANTES[variante]} ${variante !== 'lien' ? TAILLES[taille] : 'text-sm'}
        ${pleineLargeur ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}
