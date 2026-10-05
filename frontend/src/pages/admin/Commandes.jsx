import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Download, Package } from 'lucide-react';
import { Alerte, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import Pagination from '../../components/ui/Pagination';
import Onglets from '../../components/admin/Onglets';
import ChampRecherche from '../../components/admin/ChampRecherche';
import StatutCommande from '../../components/commandes/StatutCommande';
import { useRequete } from '../../hooks/useRequete';
import { useValeurDifferee } from '../../hooks/useValeurDifferee';
import { commandeApi } from '../../api/commandeApi';
import { adminApi } from '../../api/adminApi';
import { messageErreur } from '../../api/client';
import { formaterDate, formaterFCFA } from '../../utils/format';

// Regroupements de statuts, dans l'ordre du travail de l'administrateur
const FILTRES = [
  { cle: 'toutes', libelle: 'Toutes', statuts: [] },
  { cle: 'a-valider', libelle: 'À valider', statuts: ['NOUVELLE'] },
  { cle: 'a-affecter', libelle: 'À affecter', statuts: ['VALIDEE'] },
  { cle: 'en-cours', libelle: 'En cours', statuts: ['LIVREUR_AFFECTE', 'ACCEPTEE', 'EN_COURS'] },
  { cle: 'livrees', libelle: 'Livrées', statuts: ['LIVREE', 'CONFIRMEE'] },
  { cle: 'annulees', libelle: 'Annulées', statuts: ['ANNULEE'] },
];

export default function CommandesAdmin() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filtre = FILTRES.find((f) => f.cle === params.get('filtre')) || FILTRES[0];
  const page = Number(params.get('page')) || 1;
  const [saisie, setSaisie] = useState('');
  const recherche = useValeurDifferee(saisie.trim());
  const [message, setMessage] = useState(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  const compteurs = useRequete(() => adminApi.compteursCommandes(), []);
  const statutParam = filtre.statuts.join(',') || undefined;
  const requete = useRequete(
    () => commandeApi.lister({ statut: statutParam, recherche: recherche || undefined, page, limite: 15 }),
    [filtre.cle, recherche, page]
  );

  const total = (statuts) => (compteurs.donnees
    ? (statuts.length ? statuts.reduce((t, s) => t + (compteurs.donnees.parStatut[s] || 0), 0) : compteurs.donnees.total)
    : null);
  const changerFiltre = (cle) => setParams(cle === 'toutes' ? {} : { filtre: cle });

  async function validerRapidement(e, c) {
    e.stopPropagation();
    try {
      await adminApi.valider(c.id);
      setMessage({ type: 'succes', texte: `Commande ${c.numero} validée. Elle est maintenant à affecter.` });
      requete.recharger(true);
      compteurs.recharger(true);
    } catch (err) {
      setMessage({ type: 'erreur', texte: messageErreur(err) });
    }
  }

  async function exporter() {
    setExportEnCours(true);
    try { await adminApi.exporterCommandes({ statut: statutParam, recherche: recherche || undefined }); }
    catch (err) { setMessage({ type: 'erreur', texte: messageErreur(err) }); }
    finally { setExportEnCours(false); }
  }

  return (
    <>
      <EnTetePage
        titre="Gestion des commandes"
        sousTitre="Validez, affectez et suivez toutes les commandes."
        actions={<Bouton icone={Download} chargement={exportEnCours} onClick={exporter}>Exporter (CSV)</Bouton>}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Onglets onglets={FILTRES.map((f) => ({ ...f, compteur: total(f.statuts) }))} actif={filtre.cle} onChange={changerFiltre} />
        <ChampRecherche valeur={saisie} onChange={(v) => { setSaisie(v); if (page > 1) setParams((p) => { const n = new URLSearchParams(p); n.delete('page'); return n; }); }} placeholder="N°, client, adresse…" />
      </div>
      {message && <div className="mb-4"><Alerte type={message.type}>{message.texte}</Alerte></div>}

      <Carte>
        <EtatsRequete requete={requete} estVide={(d) => d.donnees.length === 0}
          vide={<EtatVide icone={Package} titre="Aucune commande" texte={recherche ? 'Aucun résultat pour cette recherche.' : 'Aucune commande dans cette catégorie.'} />}>
          {(d) => (
            <>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal)">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>{['N° commande', 'Client', 'Trajet', 'Montant', 'Statut', 'Livreur', 'Date', ''].map((t) => <th key={t} scope="col" className="px-4 py-3 font-semibold">{t}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.donnees.map((c) => (
                      <tr key={c.id} onClick={() => navigate(`/admin/commandes/${c.id}`)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900"><Link to={`/admin/commandes/${c.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-vert-600">{c.numero}</Link></td>
                        <td className="px-4 py-3 text-slate-700">{c.client.nom}</td>
                        <td className="max-w-[16rem] px-4 py-3"><p className="truncate text-slate-700">{c.depart.adresse}</p><p className="truncate text-xs text-slate-500">→ {c.arrivee.adresse} · {c.zone.nom}</p></td>
                        <td className="px-4 py-3 font-medium">{formaterFCFA(c.montant)}</td>
                        <td className="px-4 py-3"><StatutCommande statut={c.statut} /></td>
                        <td className="px-4 py-3 text-slate-600">{c.livraison?.livreur.nom || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{formaterDate(c.dateCreation)}</td>
                        <td className="px-4 py-3 text-right">
                          {c.statut === 'NOUVELLE'
                            ? <Bouton taille="sm" icone={CheckCircle2} onClick={(e) => validerRapidement(e, c)}>Valider</Bouton>
                            : <ChevronRight className="ml-auto h-4 w-4 text-slate-400" aria-hidden="true" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={d.pagination} onPage={(n) => setParams((p) => { const x = new URLSearchParams(p); x.set('page', n); return x; })} />
            </>
          )}
        </EtatsRequete>
      </Carte>
    </>
  );
}
