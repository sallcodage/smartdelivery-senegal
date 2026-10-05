import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Bike, CheckCircle2, Phone, User } from 'lucide-react';
import { Alerte, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import ModaleConfirmation from '../../components/ui/Modale';
import NoteEtoiles from '../../components/ui/NoteEtoiles';
import StatutCommande from '../../components/commandes/StatutCommande';
import Chronologie from '../../components/commandes/Chronologie';
import CarteTrajet from '../../components/carte/CarteTrajet';
import PanneauAffectation from '../../components/admin/PanneauAffectation';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { commandeApi } from '../../api/commandeApi';
import { messageErreur } from '../../api/client';
import { STATUTS_FINAUX, libelleTypeColis } from '../../config/commandes';
import { libelleVehicule } from '../../config/roles';
import { formaterDateHeure, formaterFCFA } from '../../utils/format';
import { formaterKm } from '../../utils/geo';

const ANNULABLE = ['NOUVELLE', 'VALIDEE', 'LIVREUR_AFFECTE'];

function Ligne({ libelle, children }) {
  return <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-slate-500">{libelle}</dt><dd className="text-right font-medium text-slate-800">{children}</dd></div>;
}

function Personne({ titre, icone: Icone, nom, telephone, detail, lien }) {
  return (
    <Carte className="p-5">
      <h2 className="text-base font-semibold text-slate-900">{titre}</h2>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-vert-100 text-vert-700"><Icone className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          {lien ? <Link to={lien} className="font-semibold text-slate-900 hover:text-vert-600">{nom}</Link> : <p className="font-semibold text-slate-900">{nom}</p>}
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
        <a href={`tel:${telephone}`} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" aria-label={`Appeler ${nom}`}><Phone className="h-4 w-4" /></a>
      </div>
    </Carte>
  );
}

export default function DetailCommandeAdmin() {
  const { id } = useParams();
  const requete = useRequete(() => commandeApi.obtenir(id), [id]);
  const [modale, setModale] = useState(false);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const commande = requete.donnees;

  useEffect(() => {
    if (!commande || STATUTS_FINAUX.includes(commande.statut)) return undefined;
    const m = setInterval(() => requete.recharger(true), 15000);
    return () => clearInterval(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commande?.statut]);

  async function executer(action, texte) {
    setEnvoi(true);
    setErreur('');
    try {
      requete.setDonnees(await action());
      setSucces(texte);
      setModale(false);
    } catch (err) {
      setErreur(messageErreur(err));
      requete.recharger(true);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <Link to="/admin/commandes" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Commandes</Link>
      <EtatsRequete requete={requete}>
        {(c) => (
          <>
            <EnTetePage
              titre={<span className="flex flex-wrap items-center gap-3">Commande {c.numero} <StatutCommande statut={c.statut} /></span>}
              sousTitre={`Créée le ${formaterDateHeure(c.dateCreation)}`}
              actions={ANNULABLE.includes(c.statut) && <Bouton variante="secondaire" icone={Ban} className="text-red-600" onClick={() => { setMotif(''); setErreur(''); setModale(true); }}>Annuler la commande</Bouton>}
            />
            <div className="mb-6 space-y-3">
              {succes && <Alerte type="succes">{succes}</Alerte>}
              {erreur && !modale && <Alerte type="erreur">{erreur}</Alerte>}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {c.statut === 'NOUVELLE' && (
                  <Carte className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm text-amber-900">Cette commande attend votre validation. Vérifiez le trajet et le colis.</p>
                    <Bouton icone={CheckCircle2} chargement={envoi} onClick={() => executer(() => adminApi.valider(c.id), `Commande ${c.numero} validée. Affectez maintenant un livreur.`)}>Valider la commande</Bouton>
                  </Carte>
                )}
                {c.statut === 'VALIDEE' && (
                  <Carte className="p-5">
                    <h2 className="mb-1 text-base font-semibold text-slate-900">Affecter un livreur</h2>
                    <p className="mb-4 text-sm text-slate-500">Livreurs disponibles, du plus proche au plus éloigné du point de départ.</p>
                    <PanneauAffectation commande={c} onAffectee={(r) => { requete.setDonnees(r); setSucces(`Commande affectée à ${r.livraison.livreur.nom}. Il a été notifié.`); }} />
                  </Carte>
                )}
                {c.statut === 'LIVREUR_AFFECTE' && <Alerte type="info">En attente de la réponse de {c.livraison.livreur.nom} (acceptation ou refus).</Alerte>}

                <CarteTrajet depart={c.depart} arrivee={c.arrivee} />
                <Carte className="p-5">
                  <h2 className="text-base font-semibold text-slate-900">Détails</h2>
                  <dl className="mt-2 divide-y divide-slate-100">
                    <Ligne libelle="Départ (A)">{c.depart.adresse}</Ligne>
                    <Ligne libelle="Arrivée (B)">{c.arrivee.adresse}</Ligne>
                    <Ligne libelle="Zone">{c.zone.nom}</Ligne>
                    <Ligne libelle="Colis">{libelleTypeColis(c.typeColis)} · {String(c.poidsKg).replace('.', ',')} kg</Ligne>
                    <Ligne libelle="Distance estimée">{formaterKm(c.distanceKm)}</Ligne>
                    {c.livraison?.distanceParcourueKm != null && <Ligne libelle="Distance parcourue (GPS)">{formaterKm(c.livraison.distanceParcourueKm)}</Ligne>}
                    <Ligne libelle="Montant client"><span className="font-bold text-vert-600">{formaterFCFA(c.montant)}</span></Ligne>
                    {c.livraison && <Ligne libelle="Part livreur">{formaterFCFA(c.livraison.montantLivreur)}</Ligne>}
                    {c.livraison?.noteClient && <Ligne libelle="Note du client"><span className="inline-flex"><NoteEtoiles valeur={c.livraison.noteClient} taille="h-4 w-4" /></span></Ligne>}
                  </dl>
                </Carte>
              </div>

              <div className="space-y-6">
                <Personne titre="Client" icone={User} nom={c.client.nom} telephone={c.client.telephone} detail={c.client.telephone} lien={`/admin/clients/${c.client.id}`} />
                {c.livraison && (
                  <Personne titre="Livreur" icone={Bike} nom={c.livraison.livreur.nom} telephone={c.livraison.livreur.telephone}
                    detail={`${libelleVehicule(c.livraison.livreur.vehicule)} · affecté le ${formaterDateHeure(c.livraison.dateAffectation)}`} lien={`/admin/livreurs/${c.livraison.livreur.id}`} />
                )}
                <Carte className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-slate-900">Historique des statuts</h2>
                  <Chronologie commande={c} detaillee />
                </Carte>
              </div>
            </div>

            <ModaleConfirmation
              ouverte={modale} icone={Ban} variante="danger" titre="Annuler la commande ?"
              message={`Le client${c.livraison ? ' et le livreur seront' : ' sera'} notifié(s).`} libelleConfirmer="Annuler la commande" libelleAnnuler="Retour"
              chargement={envoi} onAnnuler={() => setModale(false)}
              onConfirmer={() => executer(() => adminApi.annuler(c.id, motif.trim()), `Commande ${c.numero} annulée.`)}
            >
              <label htmlFor="motif-admin" className="text-sm font-medium text-slate-700">Motif communiqué au client</label>
              <textarea id="motif-admin" rows={2} maxLength={255} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Adresse de livraison hors zone" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-vert-500 focus:outline-none focus:ring-3 focus:ring-vert-100" />
              {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
            </ModaleConfirmation>
          </>
        )}
      </EtatsRequete>
    </>
  );
}
