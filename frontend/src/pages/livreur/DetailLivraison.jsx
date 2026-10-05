import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Navigation, Phone, Play, User, X } from 'lucide-react';
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
import { usePositionLivreur } from '../../context/PositionLivreurContext';
import { livraisonApi, commandeApi } from '../../api/commandeApi';
import { messageErreur } from '../../api/client';
import { EXPLICATIONS_LIVREUR, libelleTypeColis } from '../../config/commandes';
import { formaterDateHeure, formaterFCFA } from '../../utils/format';
import { formaterKm } from '../../utils/geo';

function Ligne({ libelle, children }) {
  return <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-slate-500">{libelle}</dt><dd className="text-right font-medium text-slate-800">{children}</dd></div>;
}

export default function DetailLivraison() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { rafraichir } = useNotifications();
  const position = usePositionLivreur();
  const requete = useRequete(() => commandeApi.obtenir(id), [id]);
  const [modale, setModale] = useState(null); // 'refuser' | 'demarrer'
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(state?.message || '');

  async function executer(action) {
    setEnvoi(true);
    setErreur('');
    try {
      await action();
      rafraichir();
    } catch (err) {
      setErreur(messageErreur(err));
      requete.recharger(true);
    } finally {
      setEnvoi(false);
    }
  }

  const accepter = () => executer(async () => {
    requete.setDonnees(await livraisonApi.accepter(id));
    setSucces('Livraison acceptée. Récupérez le colis puis démarrez la livraison.');
  });
  const refuser = () => {
    if (motif.trim().length < 3) { setErreur('Indiquez le motif du refus (3 caractères minimum).'); return; }
    executer(async () => {
      await livraisonApi.refuser(id, motif.trim());
      navigate('/livreur/livraisons', { replace: true });
    });
  };
  const demarrer = () => executer(async () => {
    await livraisonApi.demarrer(id);
    await position.actualiser(); // le partage de position bascule sur cette livraison
    navigate(`/livreur/livraisons/${id}/en-cours`);
  });

  return (
    <>
      <Link to="/livreur/livraisons" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mes livraisons
      </Link>
      <EtatsRequete requete={requete}>
        {(c) => (
          <>
            <EnTetePage
              titre={<span className="flex flex-wrap items-center gap-3">Livraison {c.numero} <StatutCommande statut={c.statut} /></span>}
              sousTitre={c.livraison ? `Affectée le ${formaterDateHeure(c.livraison.dateAffectation)}` : ''}
            />
            <div className="mb-6 space-y-3">
              {succes && <Alerte type="succes">{succes}</Alerte>}
              {erreur && !modale && <Alerte type="erreur">{erreur}</Alerte>}
              <Alerte type="info">{EXPLICATIONS_LIVREUR[c.statut]}</Alerte>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <CarteTrajet depart={c.depart} arrivee={c.arrivee} />
                <Carte className="p-5">
                  <h2 className="text-base font-semibold text-slate-900">Détails</h2>
                  <dl className="mt-2 divide-y divide-slate-100">
                    <Ligne libelle="Récupération (A)">{c.depart.adresse}</Ligne>
                    <Ligne libelle="Livraison (B)">{c.arrivee.adresse}</Ligne>
                    <Ligne libelle="Colis">{libelleTypeColis(c.typeColis)} · {String(c.poidsKg).replace('.', ',')} kg</Ligne>
                    <Ligne libelle="Distance">{formaterKm(c.distanceKm)}{c.livraison?.distanceParcourueKm != null && ` (parcourue : ${formaterKm(c.livraison.distanceParcourueKm)})`}</Ligne>
                    <Ligne libelle="Votre gain"><span className="text-base font-bold text-vert-600">{formaterFCFA(c.livraison?.montantLivreur ?? 0)}</span></Ligne>
                  </dl>
                </Carte>
              </div>

              <div className="space-y-6">
                <Carte className="space-y-3 p-5">
                  {c.statut === 'LIVREUR_AFFECTE' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Bouton variante="secondaire" icone={X} onClick={() => { setMotif(''); setErreur(''); setModale('refuser'); }}>Refuser</Bouton>
                      <Bouton icone={Check} chargement={envoi} onClick={accepter}>Accepter</Bouton>
                    </div>
                  )}
                  {c.statut === 'ACCEPTEE' && <Bouton icone={Play} pleineLargeur taille="lg" onClick={() => { setErreur(''); setModale('demarrer'); }}>Démarrer la livraison</Bouton>}
                  {c.statut === 'EN_COURS' && <Link to={`/livreur/livraisons/${c.id}/en-cours`}><Bouton icone={Navigation} pleineLargeur taille="lg">Continuer la livraison</Bouton></Link>}
                  {['LIVREE', 'CONFIRMEE'].includes(c.statut) && (
                    <div className="text-center text-sm text-slate-600">
                      Livrée le {formaterDateHeure(c.livraison?.dateFin)}
                      {c.livraison?.noteClient && <div className="mt-2 flex flex-col items-center gap-1"><NoteEtoiles valeur={c.livraison.noteClient} taille="h-5 w-5" /><span className="text-xs">Note du client</span></div>}
                    </div>
                  )}
                  {c.statut === 'ANNULEE' && <p className="text-center text-sm text-slate-500">Livraison annulée.</p>}
                </Carte>

                <Carte className="p-5">
                  <h2 className="text-base font-semibold text-slate-900">Client</h2>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-vert-100 text-vert-700"><User className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{c.client.nom}</p><p className="text-xs text-slate-500">{c.client.telephone}</p></div>
                    <a href={`tel:${c.client.telephone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-vert-500 px-3 py-2 text-sm font-semibold text-vert-600 hover:bg-vert-50" aria-label={`Appeler ${c.client.nom}`}>
                      <Phone className="h-4 w-4" aria-hidden="true" /> Appeler
                    </a>
                  </div>
                </Carte>

                <Carte className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-slate-900">Historique</h2>
                  <Chronologie commande={c} />
                </Carte>
              </div>
            </div>

            <ModaleConfirmation
              ouverte={modale === 'refuser'} icone={X} variante="danger" titre="Refuser la livraison ?"
              message="La livraison sera proposée à un autre livreur." libelleConfirmer="Refuser" libelleAnnuler="Retour"
              chargement={envoi} onAnnuler={() => setModale(null)} onConfirmer={refuser}
            >
              <label htmlFor="motif-refus" className="text-sm font-medium text-slate-700">Motif du refus <span className="text-red-500">*</span></label>
              <textarea id="motif-refus" rows={2} maxLength={255} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Panne de moto, trop éloigné…" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-vert-500 focus:outline-none focus:ring-3 focus:ring-vert-100" />
              {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
            </ModaleConfirmation>

            <ModaleConfirmation
              ouverte={modale === 'demarrer'} icone={Play} titre="Démarrer la livraison ?"
              message="Confirmez que vous avez récupéré le colis. Votre position sera partagée avec le client jusqu'à la livraison."
              libelleConfirmer="Démarrer" chargement={envoi} onAnnuler={() => setModale(null)} onConfirmer={demarrer}
            >
              {erreur && <p className="text-center text-xs text-red-600">{erreur}</p>}
            </ModaleConfirmation>
          </>
        )}
      </EtatsRequete>
    </>
  );
}
