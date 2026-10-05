import { useSearchParams } from 'react-router-dom';
import { History } from 'lucide-react';
import { Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Pagination from '../../components/ui/Pagination';
import ListeLivraisons from '../../components/livraisons/ListeLivraisons';
import { useRequete } from '../../hooks/useRequete';
import { commandeApi } from '../../api/commandeApi';
import { livreurApi } from '../../api/livreurApi';
import { formaterFCFA } from '../../utils/format';
import { formaterKm } from '../../utils/geo';

export default function Historique() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const liste = useRequete(() => commandeApi.lister({ statut: 'LIVREE,CONFIRMEE', page, limite: 10 }), [page]);
  const totaux = useRequete(() => livreurApi.performances('tout'), []);

  return (
    <>
      <EnTetePage titre="Historique" sousTitre="Vos livraisons effectuées." />
      {totaux.donnees && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            ['Livraisons', totaux.donnees.livraisonsEffectuees],
            ['Gains cumulés', formaterFCFA(totaux.donnees.gains)],
            ['Distance', formaterKm(totaux.donnees.distanceKm)],
          ].map(([l, v]) => (
            <Carte key={l} className="p-4 text-center"><p className="text-lg font-bold text-slate-900 sm:text-2xl">{v}</p><p className="text-xs text-slate-500">{l}</p></Carte>
          ))}
        </div>
      )}
      <Carte className="px-5 py-2">
        <EtatsRequete
          requete={liste}
          estVide={(d) => d.donnees.length === 0}
          vide={<EtatVide icone={History} titre="Aucune livraison effectuée" texte="Vos livraisons terminées apparaîtront ici avec vos gains." />}
        >
          {(d) => (
            <>
              <ListeLivraisons livraisons={d.donnees} afficherDate />
              <Pagination pagination={d.pagination} onPage={(n) => setParams({ page: n })} />
            </>
          )}
        </EtatsRequete>
      </Carte>
    </>
  );
}
