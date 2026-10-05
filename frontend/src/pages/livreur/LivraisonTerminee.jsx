import { Link, Navigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Carte } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import { useRequete } from '../../hooks/useRequete';
import { commandeApi } from '../../api/commandeApi';
import { formaterDateHeure, formaterFCFA } from '../../utils/format';
import { formaterKm } from '../../utils/geo';

// Écran « Fin de livraison » du prototype
export default function LivraisonTerminee() {
  const { id } = useParams();
  const requete = useRequete(() => commandeApi.obtenir(id), [id]);
  return (
    <EtatsRequete requete={requete}>
      {(c) => {
        if (!['LIVREE', 'CONFIRMEE'].includes(c.statut)) return <Navigate to={`/livreur/livraisons/${c.id}`} replace />;
        const duree = c.livraison.dateDebut && Math.max(1, Math.round((new Date(c.livraison.dateFin) - new Date(c.livraison.dateDebut)) / 60000));
        return (
          <Carte className="mx-auto max-w-md p-8 text-center">
            <CheckCircle2 className="mx-auto h-20 w-20 text-vert-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Livraison terminée !</h1>
            <p className="mt-1 text-slate-500">Commande {c.numero}</p>
            <dl className="mt-6 divide-y divide-slate-100 text-left text-sm">
              {[
                ['Client', c.client.nom],
                ['Livrée le', formaterDateHeure(c.livraison.dateFin)],
                ['Durée', duree ? `${duree} min` : '—'],
                ['Distance parcourue', formaterKm(c.livraison.distanceParcourueKm)],
              ].map(([l, v]) => <div key={l} className="flex justify-between py-2.5"><dt className="text-slate-500">{l}</dt><dd className="font-medium text-slate-800">{v}</dd></div>)}
              <div className="flex justify-between py-2.5"><dt className="text-slate-500">Votre gain</dt><dd className="text-lg font-bold text-vert-600">{formaterFCFA(c.livraison.montantLivreur)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-slate-500">Le client a été notifié et doit confirmer la réception.</p>
            <Link to="/livreur" className="mt-6 block"><Bouton pleineLargeur taille="lg">Retour à l'accueil</Bouton></Link>
          </Carte>
        );
      }}
    </EtatsRequete>
  );
}
