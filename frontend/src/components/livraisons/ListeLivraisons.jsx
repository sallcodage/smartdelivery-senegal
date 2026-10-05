import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Navigation } from 'lucide-react';
import StatutCommande from '../commandes/StatutCommande';
import { formaterDate, formaterFCFA } from '../../utils/format';
import { formaterKm } from '../../utils/geo';

// Livraisons du livreur : trajet, client, distance et gain
export default function ListeLivraisons({ livraisons, afficherDate = false }) {
  return (
    <ul className="divide-y divide-slate-100">
      {livraisons.map((c) => (
        <li key={c.id}>
          <Link to={`/livreur/livraisons/${c.id}`} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-slate-50">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vert-50 text-vert-600">
              <Navigation className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{c.numero}</p>
                <StatutCommande statut={c.statut} />
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-vert-600" aria-hidden="true" />{c.depart.adresse}
              </p>
              <p className="flex items-center gap-1 truncate text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />{c.arrivee.adresse}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {c.client.nom} · {formaterKm(c.livraison?.distanceParcourueKm ?? c.distanceKm)}
                {c.livraison?.montantLivreur != null && <> · <span className="font-semibold text-vert-700">{formaterFCFA(c.livraison.montantLivreur)}</span></>}
                {afficherDate && c.livraison?.dateFin && <> · {formaterDate(c.livraison.dateFin)}</>}
              </p>
            </div>
            <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
