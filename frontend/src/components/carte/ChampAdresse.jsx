import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { rechercherAdresses } from '../../utils/geocodage';

// Saisie d'adresse avec suggestions OpenStreetMap. Le texte reste modifiable librement.
export default function ChampAdresse({ label, couleur, valeur, onTexte, onChoix, actif, onActiver, erreur, place }) {
  const id = useId();
  const [suggestions, setSuggestions] = useState([]);
  const [recherche, setRecherche] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const saisieUtilisateur = useRef(false);

  useEffect(() => {
    if (!saisieUtilisateur.current || valeur.trim().length < 3) { setSuggestions([]); return undefined; }
    const controle = new AbortController();
    const minuterie = setTimeout(async () => {
      setRecherche(true);
      try {
        setSuggestions(await rechercherAdresses(valeur, controle.signal));
        setIndisponible(false);
        setOuvert(true);
      } catch (e) {
        if (e.name !== 'AbortError') { setSuggestions([]); setIndisponible(true); }
      } finally {
        setRecherche(false);
      }
    }, 600); // attente après la frappe : respecte la limite du service
    return () => { clearTimeout(minuterie); controle.abort(); };
  }, [valeur]);

  return (
    <div className="relative space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${couleur}`}>{label === 'Adresse de départ' ? 'A' : 'B'}</span>
          {label} <span className="text-red-500">*</span>
        </label>
        <button type="button" onClick={onActiver} aria-label={`Placer ${label.toLowerCase()} sur la carte`} className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${actif ? 'bg-vert-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} aria-pressed={actif}>
          <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />
          <span className="sm:hidden">Carte</span>
          <span className="hidden sm:inline">{actif ? 'Placement sur la carte' : 'Placer sur la carte'}</span>
        </button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id={id} value={valeur} autoComplete="off" placeholder="Rechercher un quartier, une rue, un lieu…"
          onChange={(e) => { saisieUtilisateur.current = true; onTexte(e.target.value); }}
          onFocus={() => { onActiver(); if (suggestions.length) setOuvert(true); }}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          aria-invalid={Boolean(erreur)}
          className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-9 text-sm focus:outline-none focus:ring-3 ${erreur ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-vert-500 focus:ring-vert-100'}`}
        />
        {recherche && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden="true" />}
        {ouvert && suggestions.length > 0 && (
          <ul className="absolute z-[1000] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
            {suggestions.map((s) => (
              <li key={`${s.latitude}-${s.longitude}`}>
                <button
                  type="button" role="option" aria-selected="false"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { saisieUtilisateur.current = false; setOuvert(false); onChoix(s); }}
                  className="w-full px-3 py-2 text-left hover:bg-vert-50"
                >
                  <span className="block text-sm font-medium text-slate-800">{s.adresse}</span>
                  <span className="block truncate text-xs text-slate-500">{s.complete}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {erreur ? <p className="text-xs text-red-600">{erreur}</p>
        : <p className={`text-xs ${place ? 'text-vert-700' : 'text-slate-500'}`}>
          {place ? '✓ Position placée sur la carte' : indisponible ? 'Recherche indisponible : placez le point directement sur la carte.' : 'Choisissez une suggestion ou cliquez sur la carte.'}
        </p>}
    </div>
  );
}
