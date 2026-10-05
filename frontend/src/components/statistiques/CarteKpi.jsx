import { Link } from 'react-router-dom';
import { Carte } from '../ui/Divers';

export default function CarteKpi({ icone: Icone, libelle, valeur, detail, lien, ton = 'vert' }) {
  const couleurs = { vert: 'bg-vert-50 text-vert-600', bleu: 'bg-blue-50 text-blue-600', orange: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600' }[ton];
  const contenu = (
    <Carte className={`flex h-full items-center gap-4 p-5 ${lien ? 'transition hover:border-vert-300' : ''}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${couleurs}`}><Icone className="h-6 w-6" aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="break-words text-2xl font-bold leading-tight text-slate-900">{valeur}</p>
        <p className="text-sm text-slate-500">{libelle}</p>
        {detail && <p className="text-xs leading-snug text-slate-400">{detail}</p>}
      </div>
    </Carte>
  );
  return lien ? <Link to={lien} className="block h-full">{contenu}</Link> : contenu;
}
