import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import StatutCommande from './StatutCommande';
import { formaterDate, formaterFCFA } from '../../utils/format';

export default function ListeCommandesCourte({ commandes, lien }) {
  return (
    <ul className="divide-y divide-slate-100">
      {commandes.map((c) => {
        const contenu = (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vert-50 text-vert-600"><Package className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{c.numero}</p>
              <p className="truncate text-xs text-slate-500">{c.depart.adresse} → {c.arrivee.adresse}</p>
            </div>
            <div className="text-right">
              <StatutCommande statut={c.statut} />
              <p className="mt-1 text-xs text-slate-500">{formaterFCFA(c.montant)} · {formaterDate(c.dateCreation)}</p>
            </div>
          </>
        );
        return (
          <li key={c.id}>
            {lien
              ? <Link to={lien(c)} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50">{contenu}</Link>
              : <div className="flex items-center gap-3 py-3">{contenu}</div>}
          </li>
        );
      })}
    </ul>
  );
}
