import { Search } from 'lucide-react';

export default function ChampRecherche({ valeur, onChange, placeholder }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input type="search" value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-vert-500 focus:outline-none focus:ring-3 focus:ring-vert-100" />
    </div>
  );
}
