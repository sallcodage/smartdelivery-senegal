import { CheckCircle2, Clock, Percent, Route, Star, Wallet } from 'lucide-react';
import { Carte } from '../ui/Divers';
import { formaterFCFA } from '../../utils/format';
import { formaterKm } from '../../utils/geo';

function Indicateur({ icone: Icone, libelle, valeur, detail }) {
  return (
    <Carte className="flex flex-col items-start gap-2 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vert-50 text-vert-600 sm:h-12 sm:w-12"><Icone className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-900 sm:text-2xl">{valeur}</p>
        <p className="text-sm text-slate-500">{libelle}</p>
        {detail && <p className="text-xs text-slate-400">{detail}</p>}
      </div>
    </Carte>
  );
}

// Indicateurs de performance d'un livreur (espace livreur et fiche admin)
export default function GrillePerformances({ p }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      <Indicateur icone={CheckCircle2} libelle="Livraisons effectuées" valeur={p.livraisonsEffectuees} detail={p.livraisonsActives ? `${p.livraisonsActives} en cours` : null} />
      <Indicateur icone={Wallet} libelle="Gains" valeur={formaterFCFA(p.gains)} />
      <Indicateur icone={Percent} libelle="Taux d'acceptation" valeur={p.tauxAcceptation == null ? '—' : `${p.tauxAcceptation} %`} detail={`${p.acceptees} acceptée(s), ${p.refusees} refusée(s)`} />
      <Indicateur icone={Clock} libelle="Temps moyen de livraison" valeur={p.tempsMoyenMinutes == null ? '—' : `${p.tempsMoyenMinutes} min`} detail="Du démarrage à la livraison" />
      <Indicateur icone={Route} libelle="Distance parcourue" valeur={formaterKm(p.distanceKm)} />
      <Indicateur icone={Star} libelle="Note moyenne" valeur={p.noteMoyenne == null ? '—' : `${String(p.noteMoyenne).replace('.', ',')} / 5`} detail={`${p.nombreEvaluations} évaluation(s) au total`} />
    </div>
  );
}
