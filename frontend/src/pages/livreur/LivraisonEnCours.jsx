import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Marker, Polyline } from 'react-leaflet';
import { ArrowLeft, Clock, Flag, LocateFixed, MapPin, Phone, Route, Square, Wand2 } from 'lucide-react';
import { Alerte, Carte } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import ModaleConfirmation from '../../components/ui/Modale';
import CarteTrajet from '../../components/carte/CarteTrajet';
import IndicateurPosition from '../../components/livraisons/IndicateurPosition';
import { iconeLivreur } from '../../components/carte/icones';
import { useRequete } from '../../hooks/useRequete';
import { usePositionLivreur } from '../../context/PositionLivreurContext';
import { useNotifications } from '../../context/NotificationsContext';
import { livraisonApi } from '../../api/commandeApi';
import { messageErreur } from '../../api/client';
import { distanceKm, dureeEstimeeMinutes, formaterKm, VITESSE_MOYENNE_KMH } from '../../utils/geo';

const ICONE_LIVREUR = iconeLivreur();

// Écran « Navigation GPS » du prototype
export default function LivraisonEnCours() {
  const { id } = useParams();
  const navigate = useNavigate();
  const position = usePositionLivreur();
  const { rafraichir } = useNotifications();
  const requete = useRequete(() => livraisonApi.suivi(id), [id]);
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  // Trajet enregistré en base, actualisé toutes les 10 s
  useEffect(() => {
    const m = setInterval(() => requete.recharger(true), 10000);
    return () => clearInterval(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function terminer() {
    setEnvoi(true);
    setErreur('');
    try {
      await livraisonApi.terminer(id);
      await position.actualiser();
      rafraichir();
      navigate(`/livreur/livraisons/${id}/terminee`, { replace: true });
    } catch (err) {
      setErreur(messageErreur(err));
      setEnvoi(false);
    }
  }

  return (
    <EtatsRequete requete={requete}>
      {({ commande: c, positions, dernierePosition }) => {
        if (c.statut !== 'EN_COURS') return <Navigate to={`/livreur/livraisons/${c.id}`} replace />;
        const ici = (position.livraisonEnCours?.id === c.id && position.derniere) || dernierePosition;
        const restant = ici ? distanceKm(ici, c.arrivee) : c.distanceKm;
        // Trajet enregistré + position actuelle (sans attendre la prochaine actualisation)
        const trace = [...positions, ...(ici ? [ici] : [])].map((p) => [p.latitude, p.longitude]);
        return (
          <>
            <Link to={`/livreur/livraisons/${c.id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Détail de la livraison
            </Link>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Livraison en cours · {c.numero}</h1>
              <IndicateurPosition />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CarteTrajet depart={c.depart} arrivee={c.arrivee} hauteur="h-[55vh] min-h-80">
                  {trace.length > 1 && <Polyline positions={trace} pathOptions={{ color: '#1d4ed8', weight: 5 }} />}
                  {ici && <Marker position={[ici.latitude, ici.longitude]} icon={ICONE_LIVREUR} zIndexOffset={1000} title="Votre position" />}
                </CarteTrajet>
              </div>

              <div className="space-y-4">
                <Carte className="p-5">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-vert-50 p-3">
                      <Route className="mx-auto h-5 w-5 text-vert-600" aria-hidden="true" />
                      <p className="mt-1 text-xl font-bold text-slate-900">{formaterKm(restant)}</p>
                      <p className="text-xs text-slate-500">restants</p>
                    </div>
                    <div className="rounded-xl bg-vert-50 p-3">
                      <Clock className="mx-auto h-5 w-5 text-vert-600" aria-hidden="true" />
                      <p className="mt-1 text-xl font-bold text-slate-900">≈ {dureeEstimeeMinutes(restant)} min</p>
                      <p className="text-xs text-slate-500">à {VITESSE_MOYENNE_KMH} km/h</p>
                    </div>
                  </div>
                  <p className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                    <span><span className="font-semibold">Destination :</span> {c.arrivee.adresse}</span>
                  </p>
                  <a href={`tel:${c.client.telephone}`} className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-vert-500 py-2.5 text-sm font-semibold text-vert-600 hover:bg-vert-50">
                    <Phone className="h-4 w-4" aria-hidden="true" /> Appeler {c.client.nom}
                  </a>
                </Carte>

                {position.erreur && !position.simulation && <Alerte type="avertissement">{position.erreur}</Alerte>}
                {erreur && <Alerte type="erreur">{erreur}</Alerte>}

                <Carte className="space-y-3 p-5">
                  <Bouton variante="secondaire" icone={LocateFixed} pleineLargeur onClick={position.envoyerMaintenant}>Envoyer ma position maintenant</Bouton>
                  {position.simulationAutorisee && (
                    position.simulation
                      ? <Bouton variante="secondaire" icone={Square} pleineLargeur onClick={position.arreterSimulation}>Arrêter la simulation</Bouton>
                      : <Bouton variante="secondaire" icone={Wand2} pleineLargeur onClick={position.demarrerSimulation}>Simuler le trajet (démonstration)</Bouton>
                  )}
                  <Bouton icone={Flag} pleineLargeur taille="lg" onClick={() => setConfirmer(true)}>Terminer la livraison</Bouton>
                </Carte>
              </div>
            </div>

            <ModaleConfirmation
              ouverte={confirmer} icone={Flag} titre="Terminer la livraison ?"
              message={`Confirmez que le colis a été remis à ${c.client.nom}. Le client devra confirmer la réception.`}
              libelleConfirmer="Colis livré" chargement={envoi} onAnnuler={() => setConfirmer(false)} onConfirmer={terminer}
            />
          </>
        );
      }}
    </EtatsRequete>
  );
}
