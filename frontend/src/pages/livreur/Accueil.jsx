import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, CheckCircle2, Clock, Navigation, Truck } from 'lucide-react';
import { Alerte, Carte, Interrupteur } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import ListeLivraisons from '../../components/livraisons/ListeLivraisons';
import IndicateurPosition from '../../components/livraisons/IndicateurPosition';
import { useRequete } from '../../hooks/useRequete';
import { commandeApi } from '../../api/commandeApi';
import { livreurApi } from '../../api/livreurApi';
import { messageErreur } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePositionLivreur } from '../../context/PositionLivreurContext';

async function chargerActivite() {
  const [affectees, enCours, livrees, prochaines] = await Promise.all([
    commandeApi.lister({ statut: 'LIVREUR_AFFECTE', limite: 1 }),
    commandeApi.lister({ statut: 'ACCEPTEE,EN_COURS', limite: 1 }),
    commandeApi.lister({ statut: 'LIVREE,CONFIRMEE', limite: 1 }),
    commandeApi.lister({ statut: 'LIVREUR_AFFECTE,ACCEPTEE', limite: 5 }),
  ]);
  return {
    compteurs: [
      { libelle: 'À accepter', valeur: affectees.pagination.total, icone: Clock },
      { libelle: 'En cours', valeur: enCours.pagination.total, icone: Truck },
      { libelle: 'Livrées', valeur: livrees.pagination.total, icone: CheckCircle2 },
    ],
    prochaines: prochaines.donnees,
  };
}

export default function AccueilLivreur() {
  const { utilisateur, setUtilisateur } = useAuth();
  const position = usePositionLivreur();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const requete = useRequete(chargerActivite, []);

  async function changerDisponibilite(valeur) {
    setErreur('');
    setEnvoi(true);
    try {
      const { disponibilite } = await livreurApi.changerDisponibilite(valeur);
      setUtilisateur({ ...utilisateur, disponibilite });
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-vert-500 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bonjour {utilisateur.prenom} !</h1>
            <p className="mt-1 text-white">{utilisateur.disponibilite ? 'Vous êtes disponible pour recevoir des livraisons.' : 'Vous êtes hors ligne.'}</p>
            <div className="mt-3"><IndicateurPosition surFondVert /></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-nuit-900/25 px-4 py-2">
            <span className="text-sm font-medium">Disponible</span>
            <Interrupteur actif={Boolean(utilisateur.disponibilite)} onChange={changerDisponibilite} disabled={envoi} label="Disponibilité" surFondVert />
          </div>
        </div>
      </section>
      {erreur && <Alerte type="erreur">{erreur}</Alerte>}

      {position.livraisonEnCours && (
        <Carte className="flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50 p-5">
          <div>
            <p className="font-semibold text-blue-900">Livraison en cours · {position.livraisonEnCours.numero}</p>
            <p className="text-sm text-blue-800">Destination : {position.livraisonEnCours.arrivee.adresse}</p>
          </div>
          <Link to={`/livreur/livraisons/${position.livraisonEnCours.id}/en-cours`}><Bouton icone={Navigation}>Continuer</Bouton></Link>
        </Carte>
      )}

      <EtatsRequete requete={requete}>
        {({ compteurs, prochaines }) => (
          <>
            <div className="grid grid-cols-3 gap-3">
              {compteurs.map(({ libelle, valeur, icone: Icone }) => (
                <Carte key={libelle} className="p-4 text-center">
                  <Icone className="mx-auto h-5 w-5 text-vert-600" aria-hidden="true" />
                  <p className="mt-1 text-2xl font-bold text-slate-900">{valeur}</p>
                  <p className="text-xs text-slate-500">{libelle}</p>
                </Carte>
              ))}
            </div>
            <Carte className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Prochaines livraisons</h2>
                <Link to="/livreur/livraisons" className="text-sm font-medium text-vert-600 hover:underline">Voir tout</Link>
              </div>
              {prochaines.length
                ? <ListeLivraisons livraisons={prochaines} />
                : <EtatVide icone={Bike} titre="Aucune livraison à traiter" texte={utilisateur.disponibilite ? "Les livraisons que l'administration vous confie apparaîtront ici." : 'Passez « Disponible » pour recevoir des livraisons.'} />}
            </Carte>
          </>
        )}
      </EtatsRequete>
    </div>
  );
}
