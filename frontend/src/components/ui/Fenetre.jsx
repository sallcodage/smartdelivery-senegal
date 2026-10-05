import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Fenêtre modale pour les formulaires (création / modification)
export default function Fenetre({ ouverte, titre, onFermer, children, largeur = 'max-w-lg' }) {
  const fermer = useRef(onFermer);
  fermer.current = onFermer;
  useEffect(() => {
    if (!ouverte) return undefined;
    const echap = (e) => e.key === 'Escape' && fermer.current();
    window.addEventListener('keydown', echap);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', echap); document.body.style.overflow = ''; };
  }, [ouverte]);
  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onFermer()}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-fenetre" className={`flex max-h-[92vh] w-full ${largeur} flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="titre-fenetre" className="text-lg font-bold text-slate-900">{titre}</h2>
          <button type="button" onClick={onFermer} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
