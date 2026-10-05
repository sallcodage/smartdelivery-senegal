import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Clock, Package, Percent, Star, Truck, Users, Wallet } from 'lucide-react';
import { Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import CarteKpi from '../../components/statistiques/CarteKpi';
import MiniCarteLivraisons from '../../components/statistiques/MiniCarteLivraisons';
import { Anneau, CourbeCommandes } from '../../components/statistiques/Graphiques';
import { PERIODES_KPI, formaterDuree, partsStatuts } from '../../components/statistiques/libelles';
import { useRequete } from '../../hooks/useRequete';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/adminApi';
import { formaterFCFA, initiales } from '../../utils/format';

export default function TableauDeBordAdmin() {
  const { utilisateur } = useAuth();
  const [periode, setPeriode] = useState('30j');
  const requete = useRequete(() => adminApi.kpi(periode), [periode]);
  const libellePeriode = PERIODES_KPI.find((p) => p.cle === periode).long;

  return (
    <>
      <EnTetePage
        titre="Tableau de bord"
        sousTitre={`Bonjour ${utilisateur.prenom}, voici l'activité de SmartDelivery.`}
        actions={(
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} aria-label="Période" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:border-vert-500 focus:outline-none">
            {PERIODES_KPI.map((p) => <option key={p.cle} value={p.cle}>{p.long}</option>)}
          </select>
        )}
      />
      <EtatsRequete requete={requete}>
        {(k) => {
          const i = k.indicateurs;
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CarteKpi icone={Package} libelle="Commandes" valeur={i.totalCommandes} detail={i.nouvelles ? `${i.nouvelles} à valider` : libellePeriode} lien={i.nouvelles ? '/admin/commandes?filtre=a-valider' : '/admin/commandes'} />
                <CarteKpi icone={Truck} libelle="Livraisons effectuées" valeur={i.livrees} detail={`${i.enCours} en cours`} ton="bleu" lien="/admin/livraisons" />
                <CarteKpi icone={Bike} libelle="Livreurs actifs" valeur={i.livreursActifs} detail={`${i.livreursDisponibles} disponible(s)${i.livreursEnAttente ? ` · ${i.livreursEnAttente} à valider` : ''}`} ton="violet" lien="/admin/livreurs" />
                <CarteKpi icone={Users} libelle="Clients" valeur={i.clients} ton="orange" lien="/admin/clients" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CarteKpi icone={Wallet} libelle="Chiffre d'affaires" valeur={formaterFCFA(i.chiffreAffaires)} detail={`${i.confirmees} commande(s) confirmée(s)`} />
                <CarteKpi icone={Percent} libelle="Taux de réussite" valeur={i.tauxReussite == null ? '—' : `${String(i.tauxReussite).replace('.', ',')} %`} detail={`${i.annuleesApresValidation} annulée(s) après validation`} ton="bleu" />
                <CarteKpi icone={Clock} libelle="Temps moyen de livraison" valeur={formaterDuree(i.tempsLivraisonMinutes)} detail={`Délai total moyen : ${formaterDuree(i.delaiTotalMinutes)}`} ton="violet" />
                <CarteKpi icone={Star} libelle="Satisfaction client" valeur={i.noteMoyenne == null ? '—' : `${String(i.noteMoyenne).replace('.', ',')} / 5`} detail={`${i.nombreNotes} note(s)`} ton="orange" />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Carte className="p-5 lg:col-span-2">
                  <h2 className="text-base font-semibold text-slate-900">Évolution des commandes</h2>
                  <p className="mb-2 text-xs text-slate-500">{libellePeriode}, par {k.pas === 'day' ? 'jour' : k.pas === 'week' ? 'semaine' : 'mois'}</p>
                  <CourbeCommandes donnees={k.evolution} pas={k.pas} />
                </Carte>
                <Carte className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-slate-900">Statut des commandes</h2>
                  <Anneau parts={partsStatuts(k.statuts)} />
                </Carte>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Carte className="p-5">
                  <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Top livreurs</h2><Link to="/admin/livreurs" className="text-sm font-medium text-vert-600 hover:underline">Voir tout</Link></div>
                  {k.topLivreurs.length === 0 ? <EtatVide icone={Bike} titre="Aucune livraison sur la période" /> : (
                    <ol className="divide-y divide-slate-100">
                      {k.topLivreurs.map((l, rang) => (
                        <li key={l.id}>
                          <Link to={`/admin/livreurs/${l.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                            <span className="w-5 text-center text-sm font-bold text-slate-400">{rang + 1}</span>
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-vert-100 text-xs font-semibold text-vert-700">{initiales(l)}</span>
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{l.prenom} {l.nom}</span><span className="text-xs text-slate-500">{String(l.distanceKm).replace('.', ',')} km parcourus{l.noteMoyenne && ` · ★ ${String(l.noteMoyenne).replace('.', ',')}`}</span></span>
                            <span className="text-sm font-bold text-slate-900">{l.livraisons}</span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  )}
                </Carte>
                <Carte className="p-5">
                  <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Carte des livraisons en temps réel</h2><Link to="/admin/livraisons" className="text-sm font-medium text-vert-600 hover:underline">Voir tout</Link></div>
                  <MiniCarteLivraisons />
                </Carte>
              </div>
            </div>
          );
        }}
      </EtatsRequete>
    </>
  );
}
