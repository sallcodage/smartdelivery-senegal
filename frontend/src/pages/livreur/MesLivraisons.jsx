import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bike, History } from 'lucide-react';
import { Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import ListeLivraisons from '../../components/livraisons/ListeLivraisons';
import { useRequete } from '../../hooks/useRequete';
import { commandeApi } from '../../api/commandeApi';

async function charger() {
  const [aAccepter, enCours] = await Promise.all([
    commandeApi.lister({ statut: 'LIVREUR_AFFECTE', limite: 50 }),
    commandeApi.lister({ statut: 'ACCEPTEE,EN_COURS', limite: 50 }),
  ]);
  return { aAccepter: aAccepter.donnees, enCours: enCours.donnees };
}

function Section({ titre, livraisons, vide }) {
  return (
    <Carte className="p-5">
      <h2 className="text-base font-semibold text-slate-900">{titre} <span className="text-slate-400">({livraisons.length})</span></h2>
      {livraisons.length ? <ListeLivraisons livraisons={livraisons} /> : <p className="py-6 text-center text-sm text-slate-500">{vide}</p>}
    </Carte>
  );
}

export default function MesLivraisons() {
  const requete = useRequete(charger, []);
  // Nouvelles affectations : actualisation toutes les 30 s
  useEffect(() => {
    const m = setInterval(() => requete.recharger(true), 30000);
    return () => clearInterval(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EnTetePage
        titre="Mes livraisons"
        sousTitre="Livraisons qui vous sont affectées et en cours."
        actions={<Link to="/livreur/historique" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><History className="h-4 w-4" aria-hidden="true" />Historique</Link>}
      />
      <EtatsRequete
        requete={requete}
        estVide={(d) => !d.aAccepter.length && !d.enCours.length}
        vide={<Carte><EtatVide icone={Bike} titre="Aucune livraison pour le moment" texte="Restez disponible : les livraisons que l'administration vous confie apparaîtront ici." /></Carte>}
      >
        {(d) => (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section titre="En cours" livraisons={d.enCours} vide="Aucune livraison en cours." />
            <Section titre="À accepter" livraisons={d.aAccepter} vide="Aucune nouvelle livraison à accepter." />
          </div>
        )}
      </EtatsRequete>
    </>
  );
}
