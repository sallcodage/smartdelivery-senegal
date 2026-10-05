import { forwardRef, useId, useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

// « grand » : champs plus hauts des pages d'accès (maquette de connexion)
const classeChamp = (erreur, avecIcone, grand) => `w-full border bg-white text-slate-900 placeholder:text-slate-400
  transition focus:outline-none focus:ring-3 pr-3
  ${grand ? `rounded-xl py-3.5 text-[15px] xl:py-4 xl:text-base ${avecIcone ? 'pl-12' : 'pl-4'}` : `rounded-lg py-2.5 text-sm ${avecIcone ? 'pl-10' : 'pl-3'}`}
  ${erreur ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-vert-500 focus:ring-vert-100'}`;

const classeIcone = (grand) => `pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${grand ? 'left-4 h-5 w-5' : 'left-3 h-4 w-4'}`;

function Enveloppe({ id, label, erreur, aide, requis, grand, children }) {
  return (
    <div className={grand ? 'space-y-2' : 'space-y-1.5'}>
      {label && (
        <label htmlFor={id} className={grand ? 'block text-[15px] font-semibold text-marine-900 xl:text-[17px]' : 'block text-sm font-medium text-slate-700'}>
          {label}{requis && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {erreur ? <p id={`${id}-erreur`} className="text-xs text-red-600">{erreur}</p>
        : aide && <p className="text-xs text-slate-500">{aide}</p>}
    </div>
  );
}

export const Champ = forwardRef(function Champ({ label, erreur, aide, icone: Icone, requis, grand = false, className, ...props }, ref) {
  const id = useId();
  return (
    <Enveloppe id={id} label={label} erreur={erreur} aide={aide} requis={requis} grand={grand}>
      <div className="relative">
        {Icone && <Icone className={classeIcone(grand)} aria-hidden="true" />}
        <input
          ref={ref} id={id} aria-invalid={Boolean(erreur)} aria-describedby={erreur ? `${id}-erreur` : undefined}
          required={requis} className={`${classeChamp(erreur, Boolean(Icone), grand)} ${className || ''}`} {...props}
        />
      </div>
    </Enveloppe>
  );
});

export function ChampMotDePasse({ label = 'Mot de passe', erreur, aide, icone: Icone, requis, grand = false, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const oeil = grand ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <Enveloppe id={id} label={label} erreur={erreur} aide={aide} requis={requis} grand={grand}>
      <div className="relative">
        {Icone && <Icone className={classeIcone(grand)} aria-hidden="true" />}
        <input
          id={id} type={visible ? 'text' : 'password'} aria-invalid={Boolean(erreur)} required={requis}
          aria-describedby={erreur ? `${id}-erreur` : undefined}
          {...props}
          className={`${classeChamp(erreur, Boolean(Icone), grand)} ${grand ? 'pr-12' : 'pr-10'}`}
        />
        <button
          type="button" onClick={() => setVisible((v) => !v)}
          className={`absolute top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 ${grand ? 'right-3' : 'right-2'}`}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <EyeOff className={oeil} /> : <Eye className={oeil} />}
        </button>
      </div>
    </Enveloppe>
  );
}

export function ChampSelect({ label, erreur, aide, icone: Icone, requis, options, placeholder, ...props }) {
  const id = useId();
  return (
    <Enveloppe id={id} label={label} erreur={erreur} aide={aide} requis={requis}>
      <div className="relative">
        {Icone && <Icone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />}
        <select id={id} required={requis} aria-invalid={Boolean(erreur)} className={`${classeChamp(erreur, Boolean(Icone))} appearance-none pr-9`} {...props}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      </div>
    </Enveloppe>
  );
}

export function CaseACocher({ label, erreur, ...props }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
        <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-vert-500" {...props} />
        <span>{label}</span>
      </label>
      {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
