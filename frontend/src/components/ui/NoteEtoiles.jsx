import { Star } from 'lucide-react';

export default function NoteEtoiles({ valeur, onChange, taille = 'h-8 w-8' }) {
  const lecture = !onChange;
  return (
    <div className="flex items-center gap-1" role={lecture ? 'img' : 'radiogroup'} aria-label={lecture ? `Note : ${valeur} sur 5` : 'Note du livreur'}>
      {[1, 2, 3, 4, 5].map((n) => {
        const pleine = n <= (valeur || 0);
        const etoile = <Star className={`${taille} ${pleine ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} aria-hidden="true" />;
        return lecture ? <span key={n}>{etoile}</span> : (
          <button key={n} type="button" role="radio" aria-checked={valeur === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => onChange(valeur === n ? null : n)} className="rounded transition hover:scale-110">
            {etoile}
          </button>
        );
      })}
    </div>
  );
}
