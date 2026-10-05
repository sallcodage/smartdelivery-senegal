import { useEffect, useId, useState } from 'react';
import { Camera, X } from 'lucide-react';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX = 2 * 1024 * 1024;

// Sélection d'une photo avec aperçu et contrôle immédiat (le serveur revérifie).
export default function ChampPhoto({ label, optionnel = false, fichier, onChange, erreur, icone: Icone = Camera }) {
  const id = useId();
  const [apercu, setApercu] = useState('');
  const [erreurLocale, setErreurLocale] = useState('');

  useEffect(() => {
    if (!fichier) { setApercu(''); return undefined; }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  function choisir(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) { setErreurLocale('Format accepté : JPG, PNG ou WEBP'); return; }
    if (f.size > TAILLE_MAX) { setErreurLocale('Fichier trop volumineux (2 Mo maximum)'); return; }
    setErreurLocale('');
    onChange(f);
  }

  const message = erreurLocale || erreur;
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700">{label}{!optionnel && <span className="text-red-500"> *</span>}</p>
      <div className={`flex items-center gap-3 rounded-lg border border-dashed p-3 ${message ? 'border-red-400' : 'border-slate-300'}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
          {apercu ? <img src={apercu} alt="" className="h-full w-full object-cover" /> : <Icone className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="cursor-pointer text-sm font-medium text-vert-600 hover:underline">
            {fichier ? 'Changer la photo' : 'Choisir une photo'}{optionnel && <span className="font-normal text-slate-500"> (optionnel)</span>}
          </label>
          <p className="truncate text-xs text-slate-500">{fichier ? fichier.name : 'PNG, JPG ou WEBP (max 2 Mo)'}</p>
          <input id={id} type="file" accept={TYPES.join(',')} onChange={choisir} className="sr-only" />
        </div>
        {fichier && (
          <button type="button" onClick={() => onChange(null)} className="rounded p-1 text-slate-400 hover:text-red-600" aria-label="Retirer la photo">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
