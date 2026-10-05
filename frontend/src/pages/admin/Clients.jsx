import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Pagination from '../../components/ui/Pagination';
import ChampRecherche from '../../components/admin/ChampRecherche';
import { StatutCompte } from '../../components/admin/Badges';
import { useRequete } from '../../hooks/useRequete';
import { useValeurDifferee } from '../../hooks/useValeurDifferee';
import { adminApi } from '../../api/adminApi';
import { formaterDate, formaterFCFA } from '../../utils/format';

export default function Clients() {
  const navigate = useNavigate();
  const [saisie, setSaisie] = useState('');
  const [page, setPage] = useState(1);
  const recherche = useValeurDifferee(saisie.trim());
  const requete = useRequete(() => adminApi.clients({ recherche: recherche || undefined, page, limite: 15 }), [recherche, page]);
  return (
    <>
      <EnTetePage titre="Clients" sousTitre="Activité de chaque client." actions={<ChampRecherche valeur={saisie} onChange={(v) => { setSaisie(v); setPage(1); }} placeholder="Nom, e-mail, téléphone…" />} />
      <Carte>
        <EtatsRequete requete={requete} estVide={(d) => d.donnees.length === 0} vide={<EtatVide icone={Users} titre="Aucun client" texte={recherche ? 'Aucun résultat pour cette recherche.' : 'Les clients inscrits apparaîtront ici.'} />}>
          {(d) => (
            <>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal)">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>{['Client', 'Téléphone', 'Adresse', 'Commandes', 'Terminées', 'Montant dépensé', 'Dernière commande', 'Statut'].map((t) => <th key={t} scope="col" className="px-4 py-3 font-semibold">{t}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.donnees.map((c) => (
                      <tr key={c.id} onClick={() => navigate(`/admin/clients/${c.id}`)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-4 py-3"><p className="font-medium text-slate-900">{c.prenom} {c.nom}</p><p className="text-xs text-slate-500">{c.email}</p></td>
                        <td className="px-4 py-3 text-slate-600">{c.telephone}</td>
                        <td className="max-w-[12rem] truncate px-4 py-3 text-slate-600">{c.adresse}</td>
                        <td className="px-4 py-3 font-medium">{c.nombreCommandes}</td>
                        <td className="px-4 py-3">{c.commandesConfirmees}</td>
                        <td className="px-4 py-3 font-medium text-vert-700">{formaterFCFA(c.montantTotal)}</td>
                        <td className="px-4 py-3 text-slate-500">{c.derniereCommande ? formaterDate(c.derniereCommande) : '—'}</td>
                        <td className="px-4 py-3"><StatutCompte statut={c.statutCompte} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={d.pagination} onPage={setPage} />
            </>
          )}
        </EtatsRequete>
      </Carte>
    </>
  );
}
