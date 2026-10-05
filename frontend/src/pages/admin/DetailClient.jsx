import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Mail, MapPin, Package, Pencil, Phone } from 'lucide-react';
import { Alerte, Avatar, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import Pagination from '../../components/ui/Pagination';
import { StatutCompte } from '../../components/admin/Badges';
import { useActionsCompte } from '../../components/admin/ActionsCompte';
import StatutCommande from '../../components/commandes/StatutCommande';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { commandeApi } from '../../api/commandeApi';
import { formaterDate, formaterFCFA } from '../../utils/format';

export default function DetailClient() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const profil = useRequete(() => adminApi.utilisateur(id), [id]);
  const commandes = useRequete(() => commandeApi.lister({ clientId: id, page, limite: 10 }), [id, page]);
  const { ouvrir, rendu } = useActionsCompte({ onModifie: (u, action) => { profil.setDonnees(u); setMessage({ activer: 'Compte réactivé.', suspendre: 'Compte suspendu.', modifier: 'Informations modifiées.' }[action]); } });

  return (
    <>
      <Link to="/admin/clients" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-vert-600"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Clients</Link>
      <EtatsRequete requete={profil}>
        {(c) => (
          <>
            <EnTetePage
              titre={<span className="flex flex-wrap items-center gap-3"><Avatar utilisateur={c} />{c.prenom} {c.nom} <StatutCompte statut={c.statutCompte} /></span>}
              sousTitre={`Client depuis le ${formaterDate(c.dateCreation)}`}
              actions={(
                <>
                  <Bouton variante="secondaire" icone={Pencil} onClick={() => ouvrir('modifier', c)}>Modifier</Bouton>
                  {c.statutCompte === 'ACTIF'
                    ? <Bouton variante="secondaire" icone={Ban} className="text-amber-700" onClick={() => ouvrir('suspendre', c)}>Suspendre</Bouton>
                    : <Bouton icone={CheckCircle2} onClick={() => ouvrir('activer', c)}>Réactiver</Bouton>}
                </>
              )}
            />
            {message && <div className="mb-4"><Alerte type="succes">{message}</Alerte></div>}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Carte className="space-y-3 p-5 text-sm text-slate-700">
                <h2 className="text-base font-semibold text-slate-900">Coordonnées</h2>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" aria-hidden="true" /><a href={`tel:${c.telephone}`}>{c.telephone}</a></p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="break-all">{c.email}</span></p>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />{c.adresse}</p>
              </Carte>
              <Carte className="lg:col-span-2">
                <h2 className="px-5 pt-5 text-base font-semibold text-slate-900">Commandes{commandes.donnees && ` (${commandes.donnees.pagination.total})`}</h2>
                <EtatsRequete requete={commandes} estVide={(d) => d.donnees.length === 0} vide={<EtatVide icone={Package} titre="Aucune commande" />}>
                  {(d) => (
                    <>
                      <ul className="divide-y divide-slate-100 px-5">
                        {d.donnees.map((x) => (
                          <li key={x.id}>
                            <Link to={`/admin/commandes/${x.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 text-sm hover:bg-slate-50">
                              <span className="min-w-0"><span className="block font-semibold text-slate-900">{x.numero}</span><span className="block truncate text-xs text-slate-500">{x.depart.adresse} → {x.arrivee.adresse}</span></span>
                              <span className="text-right"><StatutCommande statut={x.statut} /><span className="mt-1 block text-xs text-slate-500">{formaterFCFA(x.montant)} · {formaterDate(x.dateCreation)}</span></span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Pagination pagination={d.pagination} onPage={setPage} />
                    </>
                  )}
                </EtatsRequete>
              </Carte>
            </div>
            {rendu}
          </>
        )}
      </EtatsRequete>
    </>
  );
}
