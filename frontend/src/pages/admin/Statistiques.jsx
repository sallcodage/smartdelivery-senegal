import { useState } from 'react';
import { CheckCircle2, Clock, Download, Package, Percent, ShoppingBag, Star, Wallet } from 'lucide-react';
import { Alerte, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import Onglets from '../../components/admin/Onglets';
import CarteKpi from '../../components/statistiques/CarteKpi';
import { Anneau, BarresHorizontales, BarresRevenus, CourbeCommandes } from '../../components/statistiques/Graphiques';
import { PERIODES_KPI, formaterDuree, partsColis } from '../../components/statistiques/libelles';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { messageErreur } from '../../api/client';
import { formaterDate, formaterFCFA } from '../../utils/format';

// Écran « Analytique / Rapports » du prototype
export default function Statistiques() {
  const [periode, setPeriode] = useState('30j');
  const [exportEnCours, setExportEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const requete = useRequete(() => adminApi.kpi(periode), [periode]);

  async function exporter() {
    setExportEnCours(true);
    setErreur('');
    try { await adminApi.exporterCommandes({ du: requete.donnees.debut }); }
    catch (err) { setErreur(messageErreur(err)); }
    finally { setExportEnCours(false); }
  }

  return (
    <>
      <EnTetePage
        titre="Statistiques"
        sousTitre={requete.donnees ? `Du ${formaterDate(requete.donnees.debut)} à aujourd'hui · calculées sur les données réelles` : ' '}
        actions={(
          <>
            <Onglets onglets={PERIODES_KPI} actif={periode} onChange={setPeriode} />
            <Bouton icone={Download} chargement={exportEnCours} disabled={!requete.donnees} onClick={exporter}>Exporter</Bouton>
          </>
        )}
      />
      {erreur && <div className="mb-4"><Alerte type="erreur">{erreur}</Alerte></div>}
      <EtatsRequete requete={requete}>
        {(k) => {
          const i = k.indicateurs;
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CarteKpi icone={Package} libelle="Commandes" valeur={i.totalCommandes} detail={`${i.annulees} annulée(s)`} />
                <CarteKpi icone={CheckCircle2} libelle="Livraisons effectuées" valeur={i.livrees} detail={`${i.confirmees} confirmée(s) par le client`} ton="bleu" />
                <CarteKpi icone={Percent} libelle="Taux de réussite" valeur={i.tauxReussite == null ? '—' : `${String(i.tauxReussite).replace('.', ',')} %`} detail="Livrées ÷ (livrées + annulées après validation)" ton="violet" />
                <CarteKpi icone={Star} libelle="Note moyenne" valeur={i.noteMoyenne == null ? '—' : `${String(i.noteMoyenne).replace('.', ',')} / 5`} detail={`${i.nombreNotes} note(s) de clients`} ton="orange" />
                <CarteKpi icone={Wallet} libelle="Chiffre d'affaires" valeur={formaterFCFA(i.chiffreAffaires)} detail="Commandes confirmées" />
                <CarteKpi icone={ShoppingBag} libelle="Panier moyen" valeur={i.panierMoyen == null ? '—' : formaterFCFA(i.panierMoyen)} ton="bleu" />
                <CarteKpi icone={Clock} libelle="Temps moyen de livraison" valeur={formaterDuree(i.tempsLivraisonMinutes)} detail="Du démarrage à la remise du colis" ton="violet" />
                <CarteKpi icone={Clock} libelle="Délai total moyen" valeur={formaterDuree(i.delaiTotalMinutes)} detail="De la commande à la livraison" ton="orange" />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Carte className="p-5">
                  <h2 className="mb-2 text-base font-semibold text-slate-900">Revenus (FCFA)</h2>
                  <BarresRevenus donnees={k.evolution} pas={k.pas} />
                </Carte>
                <Carte className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-slate-900">Types de colis</h2>
                  <Anneau parts={partsColis(k.typesColis)} />
                </Carte>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Carte className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-slate-900">Zones les plus actives</h2>
                  <BarresHorizontales lignes={k.zones.map((z) => ({ libelle: z.zone, valeur: z.n, pourcentage: z.pourcentage }))} />
                </Carte>
                <Carte className="p-5">
                  <h2 className="mb-2 text-base font-semibold text-slate-900">Commandes par {k.pas === 'day' ? 'jour' : k.pas === 'week' ? 'semaine' : 'mois'}</h2>
                  <CourbeCommandes donnees={k.evolution} pas={k.pas} />
                </Carte>
              </div>
            </div>
          );
        }}
      </EtatsRequete>
    </>
  );
}
