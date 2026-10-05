import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Bike, Clock, PackageCheck, Phone, Route, Star } from 'lucide-react';
import { Alerte, Carte } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import StatutCommande from '../../components/commandes/StatutCommande';
import CarteSuivi from '../../components/carte/CarteSuivi';
import { useRequete } from '../../hooks/useRequete';
import { livraisonApi } from '../../api/commandeApi';
import { EXPLICATIONS_CLIENT, STATUTS_FINAUX } from '../../config/commandes';
import { libelleVehicule } from '../../config/roles';
import { formaterRelatif } from '../../utils/format';
import { dureeEstimeeMinutes, formaterKm, VITESSE_MOYENNE_KMH } from '../../utils/geo';

const ACTUALISATION_MS = 5000;
const POSITION_ANCIENNE_MS = 2 * 60 * 1000;

// Écran « Suivi de commande » du prototype : le livreur se déplace en direct sur la carte
export default function SuiviLivraison() {
  const { id } = useParams();
  const requete = useRequete(() => livraisonApi.suivi(id), [id]);
  const statut = requete.donnees?.commande.statut;

  useEffect(() => {
    if (!statut || STATUTS_FINAUX.includes(statut) || statut === 'LIVREE') return undefined;
    const m = setInterval(() => requete.recharger(true), ACTUALISATION_MS);
    return () => clearInterval(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut]);

  return (
    <>
      <Link to={`/client/commandes/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Détail de la commande</Link>
      <EtatsRequete requete={requete}>
        {({ commande: c, positions, dernierePosition, distanceRestanteKm, distanceParcourueKm }) => {
          const enRoute = c.statut === 'EN_COURS';
          const livreurVisible = enRoute && dernierePosition; // la position n'est partagée que pendant la livraison
          const ancienne = livreurVisible && Date.now() - new Date(dernierePosition.dateHeure).getTime() > POSITION_ANCIENNE_MS;
          return (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Suivi de {c.numero}</h1>
                <StatutCommande statut={c.statut} />
                {enRoute && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />En direct</span>}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <CarteSuivi depart={c.depart} arrivee={c.arrivee} livreur={livreurVisible ? dernierePosition : null} trace={enRoute ? positions : []} nomLivreur={c.livraison?.livreur.nom} />
                </div>

                <div className="space-y-4">
                  {enRoute ? (
                    <Carte className="p-5">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl bg-vert-50 p-3">
                          <Clock className="mx-auto h-5 w-5 text-vert-600" aria-hidden="true" />
                          <p className="mt-1 text-xl font-bold text-slate-900">≈ {dureeEstimeeMinutes(distanceRestanteKm)} min</p>
                          <p className="text-xs text-slate-500">arrivée estimée</p>
                        </div>
                        <div className="rounded-xl bg-vert-50 p-3">
                          <Route className="mx-auto h-5 w-5 text-vert-600" aria-hidden="true" />
                          <p className="mt-1 text-xl font-bold text-slate-900">{formaterKm(distanceRestanteKm)}</p>
                          <p className="text-xs text-slate-500">restants</p>
                        </div>
                      </div>
                      <p className="mt-3 text-center text-xs text-slate-500">
                        {dernierePosition ? `Position mise à jour ${formaterRelatif(dernierePosition.dateHeure)}` : 'En attente de la première position du livreur…'}
                        {' · '}{formaterKm(distanceParcourueKm)} parcourus · estimation à {VITESSE_MOYENNE_KMH} km/h
                      </p>
                      {ancienne && <p className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Signal GPS du livreur interrompu : position peut-être dépassée.</p>}
                    </Carte>
                  ) : (
                    <Alerte type={c.statut === 'LIVREE' ? 'succes' : 'info'}>
                      {c.statut === 'LIVREE' || STATUTS_FINAUX.includes(c.statut) ? EXPLICATIONS_CLIENT[c.statut]
                        : `${EXPLICATIONS_CLIENT[c.statut]} Le suivi en direct démarre lorsque le livreur prend la route.`}
                    </Alerte>
                  )}

                  {c.statut === 'LIVREE' && <Link to={`/client/commandes/${c.id}`}><Bouton icone={PackageCheck} pleineLargeur taille="lg">Confirmer la réception</Bouton></Link>}

                  {c.livraison && c.statut !== 'ANNULEE' && (
                    <Carte className="p-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Bike className="h-6 w-6" aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{c.livraison.livreur.nom}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            {libelleVehicule(c.livraison.livreur.vehicule)}
                            {c.livraison.livreur.noteMoyenne && <> · <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />{String(c.livraison.livreur.noteMoyenne).replace('.', ',')}</>}
                          </p>
                        </div>
                      </div>
                      <a href={`tel:${c.livraison.livreur.telephone}`} className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-vert-500 py-2.5 text-sm font-semibold text-vert-600 hover:bg-vert-50">
                        <Phone className="h-4 w-4" aria-hidden="true" /> Appeler le livreur
                      </a>
                    </Carte>
                  )}
                  <Carte className="space-y-2 p-5 text-sm">
                    <p><span className="font-semibold text-vert-700">A · </span>{c.depart.adresse}</p>
                    <p><span className="font-semibold text-red-600">B · </span>{c.arrivee.adresse}</p>
                  </Carte>
                </div>
              </div>
            </>
          );
        }}
      </EtatsRequete>
    </>
  );
}
