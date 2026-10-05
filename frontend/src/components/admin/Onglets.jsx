// Onglets en « pastilles » avec compteur facultatif
export default function Onglets({ onglets, actif, onChange }) {
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist">
      {onglets.map((o) => (
        <button
          key={o.cle} type="button" role="tab" aria-selected={actif === o.cle} onClick={() => onChange(o.cle)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${actif === o.cle ? 'bg-vert-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
        >
          {o.libelle}{o.compteur != null && <> <span className={` ${actif === o.cle ? 'text-white' : 'text-slate-400'}`}>({o.compteur})</span></>}
        </button>
      ))}
    </div>
  );
}
