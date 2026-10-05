import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Bike, CheckCircle2, MapPinned, PackageCheck, Pencil, Phone, Star } from 'lucide-react';
import { Alerte, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import ModaleConfirmation from '../../components/ui/Modale';
import NoteEtoiles from '../../components/ui/NoteEtoiles';
import StatutCommande from '../../components/commandes/StatutCommande';
import Chronologie from '../../components/commandes/Chronologie';
import CarteTrajet from '../../components/carte/CarteTrajet';
import { useRequete } from '../../hooks/useRequete';
import { useNotifications } from '../../context/NotificationsContext';
import { commandeApi } from '../../api/commandeApi';
import { messageErreur } from '../../api/client';
import { EXPLICATIONS_CLIENT, STATUTS_FINAUX, libelleTypeColis } from '../../config/commandes';
import { libelleVehicule } from '../../config/roles';
import { formaterDateHeure, formaterFCFA } from '../../utils/format';

const ACTUALISATION_MS = 15000;

function Ligne({ libelle, children }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-slate-500">{libelle}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function CarteLivreur({ livraison }) {
  const { livreur } = livraison;
  return (
    <Carte className="p-5">
      <h2 className="text-base font-semibold text-slate-900">Votre livreur</h2>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-vert-100 text-vert-700"><Bike className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{livreur.nom}</p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            {libelleVehicule(livreur.vehicule)}
            {livreur.noteMoyenne && <> · <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" /> {String(livreur.noteMoyenne).replace('.', ',')}</>}
          </p>
        </div>
        <a href={`tel:${livreur.telephone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-vert-500 px-3 py-2 text-sm font-semibold text-vert-600 hover:bg-vert-50" aria-label={`Appeler ${livreur.nom}`}>
          <Phone className="h-4 w-4" aria-hidden="true" /> Appeler
        </a>
      </div>
    </Carte>
  );
}

export default function DetailCommande() {
  const { id } = useParams();
  const { state } = useLocation();
  const { rafraichir } = useNotifications();
  const requete = useRequete(() => commandeApi.obtenir(id), [id]);
  const [modale, setModale] = useState(null); // 'annuler' | 'confirmer'
  const [motif, setMotif] = useState('');
  const [note, setNote] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreurAction, setErreurAction] = useState('');
  const [succes, setSucces] = useState(state?.message || '');
  const commande = requete.donnees;

  // Actualisation automatique tant que la commande évolue
  useEffect(() => {
    if (!commande || STATUTS_FINAUX.includes(commande.statut)) return undefined;
    const minuterie = setInterval(() => requete.recharger(true), ACTUALISATION_MS);
    return () => clearInterval(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commande?.statut]);

  async function executer(action, messageSucces) {
    setEnvoi(true);
    setErreurAction('');
    try {
      requete.setDonnees(await action());
      setSucces(messageSucces);
      setModale(null);
      rafraichir();
    } catch (err) {
      setErreurAction(messageErreur(err));
      requete.recharger(true); // le statut a pu changer entre-temps
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <Link to="/client/commandes" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mes commandes
      </Link>
      <EtatsRequete requete={requete}>
        {(c) => (
          <>
            <EnTetePage
              titre={<span className="flex flex-wrap items-center gap-3">Commande {c.numero} <StatutCommande statut={c.statut} /></span>}
              sousTitre={`Créée le ${formaterDateHeure(c.dateCreation)}`}
            />
            <div className="mb-6 space-y-3">
              {succes && <Alerte type="succes">{succes}</Alerte>}
              {erreurAction && !modale && <Alerte type="erreur">{erreurAction}</Alerte>}
              <Alerte type={c.statut === 'LIVREE' ? 'avertissement' : c.statut === 'ANNULEE' ? 'erreur' : 'info'}>{EXPLICATIONS_CLIENT[c.statut]}</Alerte>
              {['LIVREUR_AFFECTE', 'ACCEPTEE', 'EN_COURS'].includes(c.statut) && (
                <Link to={`/client/commandes/${c.id}/suivi`} className="block">
                  <Bouton icone={MapPinned} pleineLargeur taille="lg" variante={c.statut === 'EN_COURS' ? 'primaire' : 'secondaire'}>
                    {c.statut === 'EN_COURS' ? 'Suivre mon colis en direct' : 'Ouvrir la carte de suivi'}
                  </Bouton>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <CarteTrajet depart={c.depart} arrivee={c.arrivee} />
                <Carte className="p-5">
                  <h2 className="text-base font-semibold text-slate-900">Détails de la livraison</h2>
                  <dl className="mt-2 divide-y divide-slate-100">
                    <Ligne libelle="Départ (A)">{c.depart.adresse}</Ligne>
                    <Ligne libelle="Arrivée (B)">{c.arrivee.adresse}</Ligne>
                    <Ligne libelle="Zone">{c.zone.nom}</Ligne>
                    <Ligne libelle="Colis">{libelleTypeColis(c.typeColis)} · {String(c.poidsKg).replace('.', ',')} kg</Ligne>
                    <Ligne libelle="Distance">{String(c.distanceKm).replace('.', ',')} km</Ligne>
                    <Ligne libelle="Montant"><span className="text-base font-bold text-vert-600">{formaterFCFA(c.montant)}</span></Ligne>
                  </dl>
                </Carte>
              </div>

              <div className="space-y-6">
                {(c.statut === 'NOUVELLE' || c.statut === 'LIVREE' || c.statut === 'CONFIRMEE') && (
                  <Carte className="space-y-3 p-5">
                    {c.statut === 'NOUVELLE' && (
                      <>
                        <Link to={`/client/commandes/${c.id}/modifier`}><Bouton variante="secondaire" icone={Pencil} pleineLargeur>Modifier la commande</Bouton></Link>
                        <Bouton variante="fantome" icone={Ban} pleineLargeur className="text-red-600 hover:bg-red-50" onClick={() => { setMotif(''); setErreurAction(''); setModale('annuler'); }}>Annuler la commande</Bouton>
                      </>
                    )}
                    {c.statut === 'LIVREE' && (
                      <Bouton icone={PackageCheck} pleineLargeur taille="lg" onClick={() => { setNote(null); setErreurAction(''); setModale('confirmer'); }}>Confirmer la réception</Bouton>
                    )}
                    {c.statut === 'CONFIRMEE' && (
                      <div className="text-center">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-vert-500" aria-hidden="true" />
                        <p className="mt-2 font-semibold text-slate-900">Réception confirmée</p>
                        {c.livraison?.noteClient
                          ? <div className="mt-2 flex flex-col items-center gap-1"><NoteEtoiles valeur={c.livraison.noteClient} taille="h-5 w-5" /><p className="text-xs text-slate-500">Votre note</p></div>
                          : <p className="text-xs text-slate-500">Aucune note attribuée</p>}
                      </div>
                    )}
                  </Carte>
                )}
                {c.livraison && c.statut !== 'ANNULEE' && <CarteLivreur livraison={c.livraison} />}
                <Carte className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-slate-900">Suivi de la commande</h2>
                  <Chronologie commande={c} />
                </Carte>
              </div>
            </div>

            <ModaleConfirmation
              ouverte={modale === 'annuler'} icone={Ban} variante="danger" titre="Annuler la commande ?"
              message={`La commande ${c.numero} sera définitivement annulée.`} libelleConfirmer="Annuler la commande" libelleAnnuler="Retour"
              chargement={envoi} onAnnuler={() => setModale(null)}
              onConfirmer={() => executer(() => commandeApi.annuler(c.id, motif.trim()), `Commande ${c.numero} annulée.`)}
            >
              <label htmlFor="motif" className="text-sm font-medium text-slate-700">Motif (facultatif)</label>
              <textarea id="motif" rows={2} maxLength={255} value={motif} onChange={(e) => setMotif(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-vert-500 focus:outline-none focus:ring-3 focus:ring-vert-100" placeholder="Ex. Colis plus disponible" />
              {erreurAction && <p className="mt-2 text-xs text-red-600">{erreurAction}</p>}
            </ModaleConfirmation>

            <ModaleConfirmation
              ouverte={modale === 'confirmer'} icone={PackageCheck} titre="Confirmer la réception"
              message="Confirmez que vous avez bien reçu votre colis." libelleConfirmer="Confirmer"
              chargement={envoi} onAnnuler={() => setModale(null)}
              onConfirmer={() => executer(() => commandeApi.confirmer(c.id, note), 'Merci ! La réception de votre colis est confirmée.')}
            >
              <p className="text-center text-sm font-medium text-slate-700">Notez votre livreur (facultatif)</p>
              <div className="mt-2 flex justify-center"><NoteEtoiles valeur={note} onChange={setNote} /></div>
              {erreurAction && <p className="mt-2 text-center text-xs text-red-600">{erreurAction}</p>}
            </ModaleConfirmation>
          </>
        )}
      </EtatsRequete>
    </>
  );
}
