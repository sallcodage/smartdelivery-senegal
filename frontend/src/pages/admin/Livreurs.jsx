import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Star, UserPlus } from 'lucide-react';
import { Alerte, Avatar, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import Fenetre from '../../components/ui/Fenetre';
import Onglets from '../../components/admin/Onglets';
import ChampRecherche from '../../components/admin/ChampRecherche';
import FormulaireUtilisateur from '../../components/admin/FormulaireUtilisateur';
import { EtatLivreur, StatutCompte } from '../../components/admin/Badges';
import { BoutonsCompte, useActionsCompte } from '../../components/admin/ActionsCompte';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { libelleVehicule } from '../../config/roles';

const FILTRES = [
  { cle: 'tous', libelle: 'Tous', test: () => true },
  { cle: 'attente', libelle: 'À valider', test: (l) => l.statutCompte === 'EN_ATTENTE' },
  { cle: 'disponibles', libelle: 'Disponibles', test: (l) => l.statutCompte === 'ACTIF' && l.etat === 'DISPONIBLE' },
  { cle: 'livraison', libelle: 'En livraison', test: (l) => l.etat === 'EN_LIVRAISON' },
  { cle: 'hors-ligne', libelle: 'Hors ligne', test: (l) => l.statutCompte === 'ACTIF' && l.etat === 'HORS_LIGNE' },
  { cle: 'suspendus', libelle: 'Suspendus', test: (l) => l.statutCompte === 'INACTIF' },
];

export default function Livreurs() {
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState('tous');
  const [saisie, setSaisie] = useState('');
  const [creation, setCreation] = useState(false);
  const [message, setMessage] = useState('');
  const requete = useRequete(() => adminApi.livreurs(), []);
  const actualiser = (texte) => { setMessage(texte); requete.recharger(true); };
  const { ouvrir, rendu, moi } = useActionsCompte({ onModifie: (u) => actualiser(`${u.prenom} ${u.nom} : compte mis à jour.`), onSupprime: (u) => actualiser(`${u.prenom} ${u.nom} supprimé.`) });

  const visibles = useMemo(() => {
    const test = FILTRES.find((f) => f.cle === filtre).test;
    const q = saisie.trim().toLowerCase();
    return (requete.donnees || []).filter((l) => test(l) && (!q || `${l.prenom} ${l.nom} ${l.telephone}`.toLowerCase().includes(q)));
  }, [requete.donnees, filtre, saisie]);

  return (
    <>
      <EnTetePage titre="Gestion des livreurs" sousTitre="Disponibilité, validation des comptes et performances." actions={<Bouton icone={UserPlus} onClick={() => setCreation(true)}>Ajouter un livreur</Bouton>} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Onglets onglets={FILTRES.map((f) => ({ ...f, compteur: requete.donnees ? requete.donnees.filter(f.test).length : null }))} actif={filtre} onChange={setFiltre} />
        <ChampRecherche valeur={saisie} onChange={setSaisie} placeholder="Nom ou téléphone…" />
      </div>
      {message && <div className="mb-4"><Alerte type="succes">{message}</Alerte></div>}
      <Carte>
        <EtatsRequete requete={requete}>
          {() => (visibles.length === 0 ? <EtatVide icone={Bike} titre="Aucun livreur" texte="Aucun livreur ne correspond à ce filtre." /> : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal)">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>{['Livreur', 'Téléphone', 'Véhicule', 'Disponibilité', 'Compte', 'Note', 'Livraisons', 'Actions'].map((t) => <th key={t} scope="col" className={`px-4 py-3 font-semibold ${t === 'Actions' ? 'text-right' : ''}`}>{t}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibles.map((l) => (
                    <tr key={l.id} onClick={() => navigate(`/admin/livreurs/${l.id}`)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar utilisateur={l} taille="sm" /><span className="font-medium text-slate-900">{l.prenom} {l.nom}</span></div></td>
                      <td className="px-4 py-3 text-slate-600">{l.telephone}</td>
                      <td className="px-4 py-3 text-slate-600">{libelleVehicule(l.vehicule)}</td>
                      <td className="px-4 py-3">{l.statutCompte === 'ACTIF' ? <EtatLivreur etat={l.etat} /> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3"><StatutCompte statut={l.statutCompte} /></td>
                      <td className="px-4 py-3 text-slate-600">{l.noteMoyenne ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />{String(l.noteMoyenne).replace('.', ',')}</span> : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{l.livraisonsEffectuees}{l.livraisonsActives > 0 && <span className="text-xs text-blue-600"> (+{l.livraisonsActives} en cours)</span>}</td>
                      <td className="px-4 py-3"><BoutonsCompte utilisateur={l} ouvrir={ouvrir} moi={moi} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </EtatsRequete>
      </Carte>
      {rendu}
      <Fenetre ouverte={creation} titre="Ajouter un livreur" onFermer={() => setCreation(false)}>
        {creation && <FormulaireUtilisateur roleInitial="LIVREUR" onAnnuler={() => setCreation(false)} onEnregistre={(u) => { setCreation(false); actualiser(`Livreur ${u.prenom} ${u.nom} créé : compte actif.`); }} />}
      </Fenetre>
    </>
  );
}
