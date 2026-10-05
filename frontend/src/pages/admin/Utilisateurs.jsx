import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users } from 'lucide-react';
import { Alerte, Avatar, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import Pagination from '../../components/ui/Pagination';
import Fenetre from '../../components/ui/Fenetre';
import Onglets from '../../components/admin/Onglets';
import ChampRecherche from '../../components/admin/ChampRecherche';
import FormulaireUtilisateur from '../../components/admin/FormulaireUtilisateur';
import { RoleUtilisateur, StatutCompte } from '../../components/admin/Badges';
import { BoutonsCompte, useActionsCompte } from '../../components/admin/ActionsCompte';
import { useRequete } from '../../hooks/useRequete';
import { useValeurDifferee } from '../../hooks/useValeurDifferee';
import { adminApi } from '../../api/adminApi';
import { formaterDate } from '../../utils/format';

const ONGLETS = [
  { cle: '', libelle: 'Tous', compteur: 'TOUS' },
  { cle: 'CLIENT', libelle: 'Clients', compteur: 'CLIENT' },
  { cle: 'LIVREUR', libelle: 'Livreurs', compteur: 'LIVREUR' },
  { cle: 'ADMIN', libelle: 'Administrateurs', compteur: 'ADMIN' },
];
const FICHE = { CLIENT: (id) => `/admin/clients/${id}`, LIVREUR: (id) => `/admin/livreurs/${id}` };

export default function Utilisateurs() {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [statut, setStatut] = useState('');
  const [saisie, setSaisie] = useState('');
  const [page, setPage] = useState(1);
  const [creation, setCreation] = useState(false);
  const [message, setMessage] = useState('');
  const recherche = useValeurDifferee(saisie.trim());
  const requete = useRequete(
    () => adminApi.utilisateurs({ role: role || undefined, statut: statut || undefined, recherche: recherche || undefined, page, limite: 15 }),
    [role, statut, recherche, page]
  );
  const actualiser = (texte) => { setMessage(texte); requete.recharger(true); };
  const { ouvrir, rendu, moi } = useActionsCompte({
    onModifie: (u, action) => actualiser({ valider: `Compte de ${u.prenom} ${u.nom} validé.`, activer: `${u.prenom} ${u.nom} réactivé.`, suspendre: `${u.prenom} ${u.nom} suspendu.`, modifier: 'Compte modifié.' }[action]),
    onSupprime: (u) => actualiser(`Compte de ${u.prenom} ${u.nom} supprimé.`),
  });

  return (
    <>
      <EnTetePage titre="Gestion des utilisateurs" sousTitre="Tous les comptes de la plateforme." actions={<Bouton icone={UserPlus} onClick={() => setCreation(true)}>Ajouter un utilisateur</Bouton>} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Onglets
          onglets={ONGLETS.map((o) => ({ ...o, compteur: requete.donnees?.compteurs[o.compteur] }))}
          actif={role} onChange={(r) => { setRole(r); setPage(1); }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1); }} aria-label="Filtrer par statut" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vert-500 focus:outline-none">
            <option value="">Tous les statuts</option><option value="ACTIF">Actifs</option><option value="EN_ATTENTE">En attente</option><option value="INACTIF">Suspendus</option>
          </select>
          <ChampRecherche valeur={saisie} onChange={(v) => { setSaisie(v); setPage(1); }} placeholder="Nom, e-mail, téléphone…" />
        </div>
      </div>
      {message && <div className="mb-4"><Alerte type="succes">{message}</Alerte></div>}
      <Carte>
        <EtatsRequete requete={requete} estVide={(d) => d.donnees.length === 0} vide={<EtatVide icone={Users} titre="Aucun utilisateur" texte="Modifiez les filtres ou la recherche." />}>
          {(d) => (
            <>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal)">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>{['Utilisateur', 'Téléphone', 'Rôle', 'Statut', 'Inscrit le', 'Actions'].map((t) => <th key={t} scope="col" className={`px-4 py-3 font-semibold ${t === 'Actions' ? 'text-right' : ''}`}>{t}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.donnees.map((u) => (
                      <tr key={u.id} onClick={() => FICHE[u.role] && navigate(FICHE[u.role](u.id))} className={FICHE[u.role] ? 'cursor-pointer hover:bg-slate-50' : ''}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar utilisateur={u} taille="sm" />
                            <div className="min-w-0"><p className="font-medium text-slate-900">{u.prenom} {u.nom}{u.id === moi.id && <span className="text-xs text-slate-400"> (vous)</span>}</p><p className="truncate text-xs text-slate-500">{u.email}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.telephone}</td>
                        <td className="px-4 py-3"><RoleUtilisateur role={u.role} /></td>
                        <td className="px-4 py-3"><StatutCompte statut={u.statutCompte} /></td>
                        <td className="px-4 py-3 text-slate-500">{formaterDate(u.dateCreation)}</td>
                        <td className="px-4 py-3"><BoutonsCompte utilisateur={u} ouvrir={ouvrir} moi={moi} /></td>
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
      {rendu}
      <Fenetre ouverte={creation} titre="Ajouter un utilisateur" onFermer={() => setCreation(false)}>
        {creation && <FormulaireUtilisateur roleInitial={role || 'CLIENT'} onAnnuler={() => setCreation(false)} onEnregistre={(u) => { setCreation(false); actualiser(`Compte de ${u.prenom} ${u.nom} créé (${u.email}).`); }} />}
      </Fenetre>
    </>
  );
}
