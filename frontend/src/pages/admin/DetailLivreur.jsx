import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Mail, Pencil, Phone, UserCheck } from 'lucide-react';
import { Alerte, Avatar, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import ImageProtegee from '../../components/ui/ImageProtegee';
import Onglets from '../../components/admin/Onglets';
import { StatutCompte } from '../../components/admin/Badges';
import { useActionsCompte } from '../../components/admin/ActionsCompte';
import GrillePerformances from '../../components/livraisons/GrillePerformances';
import StatutCommande from '../../components/commandes/StatutCommande';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { commandeApi } from '../../api/commandeApi';
import { libelleVehicule } from '../../config/roles';
import { formaterDate, formaterFCFA } from '../../utils/format';

const PERIODES = [{ cle: '7j', libelle: '7 jours' }, { cle: '30j', libelle: '30 jours' }, { cle: 'tout', libelle: 'Tout' }];

export default function DetailLivreur() {
  const { id } = useParams();
  const [periode, setPeriode] = useState('30j');
  const [message, setMessage] = useState('');
  const profil = useRequete(() => adminApi.utilisateur(id), [id]);
  const performances = useRequete(() => adminApi.performancesLivreur(id, periode), [id, periode]);
  const livraisons = useRequete(() => commandeApi.lister({ livreurId: id, limite: 8 }), [id]);
  const { ouvrir, rendu } = useActionsCompte({
    onModifie: (u, action) => { profil.setDonnees(u); setMessage({ valider: 'Compte validé : le livreur peut se connecter.', activer: 'Compte réactivé.', suspendre: 'Compte suspendu.', modifier: 'Informations modifiées.' }[action]); },
  });

  return (
    <>
      <Link to="/admin/livreurs" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Livreurs</Link>
      <EtatsRequete requete={profil}>
        {(l) => (
          <>
            <EnTetePage
              titre={<span className="flex flex-wrap items-center gap-3"><Avatar utilisateur={l} />{l.prenom} {l.nom} <StatutCompte statut={l.statutCompte} /></span>}
              sousTitre={`Livreur depuis le ${formaterDate(l.dateCreation)} · ${libelleVehicule(l.vehicule)}`}
              actions={(
                <>
                  <Bouton variante="secondaire" icone={Pencil} onClick={() => ouvrir('modifier', l)}>Modifier</Bouton>
                  {l.statutCompte === 'EN_ATTENTE' && <Bouton icone={UserCheck} onClick={() => ouvrir('valider', l)}>Valider le compte</Bouton>}
                  {l.statutCompte === 'ACTIF' && <Bouton variante="secondaire" icone={Ban} className="text-amber-700" onClick={() => ouvrir('suspendre', l)}>Suspendre</Bouton>}
                  {l.statutCompte === 'INACTIF' && <Bouton icone={CheckCircle2} onClick={() => ouvrir('activer', l)}>Réactiver</Bouton>}
                </>
              )}
            />
            <div className="mb-6 space-y-3">
              {message && <Alerte type="succes">{message}</Alerte>}
              {l.statutCompte === 'EN_ATTENTE' && <Alerte type="avertissement">Inscription en attente : vérifiez le permis et le véhicule ci-dessous avant de valider le compte.</Alerte>}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Carte className="space-y-4 p-5">
                <h2 className="text-base font-semibold text-slate-900">Coordonnées et documents</h2>
                <p className="flex items-center gap-2 text-sm text-slate-700"><Phone className="h-4 w-4 text-slate-400" aria-hidden="true" /><a href={`tel:${l.telephone}`} className="hover:text-vert-600">{l.telephone}</a></p>
                <p className="flex items-center gap-2 text-sm text-slate-700"><Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="break-all">{l.email}</span></p>
                <p className="text-sm text-slate-700"><span className="text-slate-500">Permis :</span> {l.numeroPermis || 'non renseigné'}</p>
                <div><p className="mb-1 text-sm font-medium text-slate-700">Photo du permis</p><ImageProtegee url={l.photoPermisUrl} alt={`Permis de ${l.prenom} ${l.nom}`} /></div>
                <div><p className="mb-1 text-sm font-medium text-slate-700">Photo du véhicule</p><ImageProtegee url={l.photoVehiculeUrl} alt={`Véhicule de ${l.prenom} ${l.nom}`} /></div>
              </Carte>

              <div className="space-y-6 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900">Performances</h2>
                  <Onglets onglets={PERIODES} actif={periode} onChange={setPeriode} />
                </div>
                <EtatsRequete requete={performances}>{(p) => <GrillePerformances p={p} />}</EtatsRequete>

                <Carte className="p-5">
                  <h2 className="text-base font-semibold text-slate-900">Dernières livraisons</h2>
                  <EtatsRequete requete={livraisons} estVide={(d) => d.donnees.length === 0} vide={<EtatVide titre="Aucune livraison" texte="Ce livreur n'a encore reçu aucune livraison." />}>
                    {(d) => (
                      <ul className="mt-2 divide-y divide-slate-100">
                        {d.donnees.map((c) => (
                          <li key={c.id}>
                            <Link to={`/admin/commandes/${c.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 text-sm hover:bg-slate-50">
                              <span className="min-w-0"><span className="block font-semibold text-slate-900">{c.numero}</span><span className="block truncate text-xs text-slate-500">{c.depart.adresse} → {c.arrivee.adresse}</span></span>
                              <span className="text-right"><StatutCommande statut={c.statut} /><span className="mt-1 block text-xs text-slate-500">{formaterFCFA(c.livraison?.montantLivreur ?? 0)} · {formaterDate(c.dateCreation)}</span></span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </EtatsRequete>
                </Carte>
              </div>
            </div>
            {rendu}
          </>
        )}
      </EtatsRequete>
    </>
  );
}
