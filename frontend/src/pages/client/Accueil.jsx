import { Link } from 'react-router-dom';
import { ChevronRight, ListOrdered, MapPinned, Package, PackagePlus } from 'lucide-react';
import { Carte } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import StatutCommande from '../../components/commandes/StatutCommande';
import ListeCommandesCourte from '../../components/commandes/ListeCommandesCourte';
import { useRequete } from '../../hooks/useRequete';
import { commandeApi } from '../../api/commandeApi';
import { useAuth } from '../../context/AuthContext';
import { ETAPES, EXPLICATIONS_CLIENT, STATUTS_ACTIFS } from '../../config/commandes';

async function charger() {
  const [recentes, actives] = await Promise.all([
    commandeApi.lister({ limite: 5 }),
    commandeApi.lister({ statut: STATUTS_ACTIFS.join(','), limite: 1 }),
  ]);
  return { recentes: recentes.donnees, enCours: actives.donnees[0] || null, nombreEnCours: actives.pagination.total };
}

const ACTIONS = [
  { lien: '/client/commandes/nouvelle', libelle: 'Nouvelle commande', icone: PackagePlus },
  { lien: '/client/commandes', libelle: 'Mes commandes', icone: ListOrdered },
  { lien: '/client/commandes?filtre=en-cours', libelle: 'Suivi', icone: MapPinned },
];

export default function AccueilClient() {
  const { utilisateur } = useAuth();
  const requete = useRequete(charger, []);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-vert-500 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">Bonjour {utilisateur.prenom} !</h1>
        <p className="mt-1 text-white">Que souhaitez-vous faire livrer aujourd'hui ?</p>
      </section>

      <nav className="grid grid-cols-3 gap-3" aria-label="Actions rapides">
        {ACTIONS.map(({ lien, libelle, icone: Icone }) => (
          <Link key={libelle} to={lien} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-700 shadow-sm hover:border-vert-300 hover:text-vert-700">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-vert-500 text-white"><Icone className="h-5 w-5" aria-hidden="true" /></span>
            {libelle}
          </Link>
        ))}
      </nav>

      <EtatsRequete requete={requete}>
        {({ recentes, enCours, nombreEnCours }) => (
          <>
            {enCours && (
              <Link to={`/client/commandes/${enCours.id}${enCours.statut === 'EN_COURS' ? '/suivi' : ''}`} className="block">
                <Carte className="p-5 hover:border-vert-300">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Commande en cours{nombreEnCours > 1 && ` (${nombreEnCours})`}</p>
                    <StatutCommande statut={enCours.statut} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{enCours.numero} · {enCours.depart.adresse} → {enCours.arrivee.adresse}</p>
                  <div className="mt-3 flex gap-1" aria-hidden="true">
                    {ETAPES.slice(0, 6).map((e, i) => (
                      <span key={e.statut} className={`h-1.5 flex-1 rounded-full ${i <= ETAPES.findIndex((x) => x.statut === enCours.statut) ? 'bg-vert-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className="mt-2 flex items-center justify-between text-xs text-slate-500">{EXPLICATIONS_CLIENT[enCours.statut]}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /></p>
                </Carte>
              </Link>
            )}
            <Carte className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Commandes récentes</h2>
                {recentes.length > 0 && <Link to="/client/commandes" className="text-sm font-medium text-vert-600 hover:underline">Voir tout</Link>}
              </div>
              {recentes.length
                ? <ListeCommandesCourte commandes={recentes} lien={(c) => `/client/commandes/${c.id}`} />
                : <EtatVide icone={Package} titre="Aucune commande pour le moment" texte="Créez votre première commande : le prix est calculé automatiquement selon la distance." action={<Link to="/client/commandes/nouvelle"><Bouton icone={PackagePlus}>Nouvelle commande</Bouton></Link>} />}
            </Carte>
          </>
        )}
      </EtatsRequete>
    </div>
  );
}
