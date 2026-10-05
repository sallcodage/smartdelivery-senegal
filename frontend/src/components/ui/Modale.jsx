import { useEffect, useRef } from 'react';
import Bouton from './Bouton';

// Fenêtre de confirmation ; `children` permet d'ajouter un contenu (motif, note…)
export default function ModaleConfirmation({
  ouverte, titre, message, libelleConfirmer = 'Confirmer', variante = 'primaire', icone: Icone,
  chargement, onConfirmer, onAnnuler, children, libelleAnnuler = 'Annuler',
}) {
  const boutonAnnuler = useRef(null);
  const fermer = useRef(onAnnuler);
  fermer.current = chargement ? () => {} : onAnnuler;

  // Focus placé UNE seule fois, à l'ouverture (sinon la saisie dans la fenêtre serait interrompue)
  useEffect(() => {
    if (!ouverte) return undefined;
    boutonAnnuler.current?.focus();
    const echap = (e) => e.key === 'Escape' && fermer.current();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [ouverte]);

  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !chargement && onAnnuler()}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-modale" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        {Icone && (
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${variante === 'danger' ? 'bg-red-50 text-red-600' : 'bg-vert-50 text-vert-600'}`}>
            <Icone className="h-7 w-7" aria-hidden="true" />
          </div>
        )}
        <h2 id="titre-modale" className="text-lg font-bold text-slate-900">{titre}</h2>
        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
        {children && <div className="mt-4 text-left">{children}</div>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Bouton ref={boutonAnnuler} variante="secondaire" onClick={onAnnuler} disabled={chargement}>{libelleAnnuler}</Bouton>
          <Bouton variante={variante} chargement={chargement} onClick={onConfirmer}>{libelleConfirmer}</Bouton>
        </div>
      </div>
    </div>
  );
}
