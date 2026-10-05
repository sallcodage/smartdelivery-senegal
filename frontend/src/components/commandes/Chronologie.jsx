import { ETAPES, STATUTS_FINAUX } from '../../config/commandes';
import { formaterDateHeure } from '../../utils/format';
import { LIBELLES_ROLE } from '../../config/roles';

function libelleEvenement(h) {
  if (h.ancienStatut === 'LIVREUR_AFFECTE' && h.nouveauStatut === 'VALIDEE') return 'Livraison refusée, réaffectation en cours';
  if (h.nouveauStatut === 'ANNULEE') return 'Commande annulée';
  return ETAPES.find((e) => e.statut === h.nouveauStatut)?.libelle || h.libelle;
}

// Événements réels (historique en base) puis étapes restantes du parcours normal.
export default function Chronologie({ commande, detaillee = false }) {
  const evenements = commande.historique || [];
  const indexActuel = ETAPES.findIndex((e) => e.statut === commande.statut);
  const aVenir = STATUTS_FINAUX.includes(commande.statut) || indexActuel < 0 ? [] : ETAPES.slice(indexActuel + 1);

  return (
    <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
      {evenements.map((h, i) => {
        const dernier = i === evenements.length - 1;
        const refus = h.ancienStatut === 'LIVREUR_AFFECTE' && h.nouveauStatut === 'VALIDEE';
        const annulation = h.nouveauStatut === 'ANNULEE';
        const couleur = annulation ? 'bg-red-500' : refus ? 'bg-amber-500' : 'bg-vert-500';
        return (
          <li key={`${h.dateChangement}-${i}`} className="relative">
            <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full ring-4 ring-white ${couleur} ${dernier && !STATUTS_FINAUX.includes(commande.statut) ? 'animate-pulse' : ''}`} aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900">{libelleEvenement(h)}</p>
            <p className="text-xs text-slate-500">{formaterDateHeure(h.dateChangement)}</p>
            {detaillee && h.auteur && <p className="text-xs text-slate-500">Par {h.auteur} ({LIBELLES_ROLE[h.auteurRole]})</p>}
            {h.motif && (detaillee || annulation) && <p className="mt-1 text-xs italic text-slate-600">Motif : {h.motif}</p>}
          </li>
        );
      })}
      {aVenir.map((e) => (
        <li key={e.statut} className="relative">
          <span className="absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-slate-300 bg-white ring-4 ring-white" aria-hidden="true" />
          <p className="text-sm text-slate-400">{e.libelle}</p>
        </li>
      ))}
    </ol>
  );
}
