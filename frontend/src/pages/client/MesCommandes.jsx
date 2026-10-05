import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Package, PackagePlus, Search } from 'lucide-react';
import { Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import Bouton from '../../components/ui/Bouton';
import Pagination from '../../components/ui/Pagination';
import StatutCommande from '../../components/commandes/StatutCommande';
import { useRequete } from '../../hooks/useRequete';
import { commandeApi } from '../../api/commandeApi';
import { FILTRES_COMMANDES, libelleTypeColis } from '../../config/commandes';
import { formaterDate, formaterFCFA } from '../../utils/format';

const PAR_PAGE = 10;

export default function MesCommandes() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filtre = FILTRES_COMMANDES.find((f) => f.cle === params.get('filtre')) || FILTRES_COMMANDES[0];
  const page = Number(params.get('page')) || 1;
  const [saisie, setSaisie] = useState(params.get('q') || '');
  const recherche = params.get('q') || '';

  // La recherche part 400 ms après la dernière frappe
  useEffect(() => {
    const minuterie = setTimeout(() => {
      if (saisie.trim() !== recherche) setParams((p) => { const n = new URLSearchParams(p); if (saisie.trim()) n.set('q', saisie.trim()); else n.delete('q'); n.delete('page'); return n; });
    }, 400);
    return () => clearTimeout(minuterie);
  }, [saisie, recherche, setParams]);

  const requete = useRequete(
    () => commandeApi.lister({ statut: filtre.statuts || undefined, recherche: recherche || undefined, page, limite: PAR_PAGE }),
    [filtre.cle, recherche, page]
  );

  const changerFiltre = (cle) => setParams(cle === 'toutes' ? {} : { filtre: cle });
  const changerPage = (n) => setParams((p) => { const x = new URLSearchParams(p); x.set('page', n); return x; });
  const ouvrir = (id) => navigate(`/client/commandes/${id}`);

  return (
    <>
      <EnTetePage
        titre="Mes commandes"
        sousTitre="Suivez l'état de toutes vos livraisons."
        actions={<Link to="/client/commandes/nouvelle"><Bouton icone={PackagePlus}>Nouvelle commande</Bouton></Link>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto" role="tablist">
          {FILTRES_COMMANDES.map((f) => (
            <button
              key={f.cle} type="button" role="tab" aria-selected={f.cle === filtre.cle} onClick={() => changerFiltre(f.cle)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${f.cle === filtre.cle ? 'bg-vert-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
            >
              {f.libelle}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="N° de commande, adresse…" aria-label="Rechercher une commande"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-vert-500 focus:outline-none focus:ring-3 focus:ring-vert-100"
          />
        </div>
      </div>

      <Carte>
        <EtatsRequete
          requete={requete}
          estVide={(d) => d.donnees.length === 0}
          vide={(
            <EtatVide
              icone={Package}
              titre={recherche ? 'Aucune commande ne correspond à votre recherche' : 'Aucune commande dans cette catégorie'}
              texte={recherche ? 'Essayez un autre numéro ou une autre adresse.' : 'Créez votre première commande de livraison.'}
              action={!recherche && <Link to="/client/commandes/nouvelle"><Bouton icone={PackagePlus}>Nouvelle commande</Bouton></Link>}
            />
          )}
        >
          {(d) => (
            <>
              {/* Ordinateur : tableau */}
              <div className="hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal)">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">N° commande</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Trajet</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Colis</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Montant</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                      <th scope="col"><span className="sr-only">Ouvrir</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.donnees.map((c) => (
                      <tr key={c.id} onClick={() => ouvrir(c.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900"><Link to={`/client/commandes/${c.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-vert-600">{c.numero}</Link></td>
                        <td className="max-w-xs px-4 py-3"><p className="truncate text-slate-800">{c.depart.adresse}</p><p className="truncate text-xs text-slate-500">→ {c.arrivee.adresse}</p></td>
                        <td className="px-4 py-3 text-slate-600">{libelleTypeColis(c.typeColis)}<p className="text-xs text-slate-400">{String(c.poidsKg).replace('.', ',')} kg</p></td>
                        <td className="px-4 py-3 font-medium text-slate-800">{formaterFCFA(c.montant)}</td>
                        <td className="px-4 py-3"><StatutCommande statut={c.statut} /></td>
                        <td className="px-4 py-3 text-slate-500">{formaterDate(c.dateCreation)}</td>
                        <td className="px-2"><ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile : cartes */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {d.donnees.map((c) => (
                  <li key={c.id}>
                    <Link to={`/client/commandes/${c.id}`} className="flex items-start gap-3 p-4 active:bg-slate-50">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vert-50 text-vert-600"><Package className="h-5 w-5" aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{c.numero}</p>
                          <StatutCommande statut={c.statut} />
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-600">{c.depart.adresse} → {c.arrivee.adresse}</p>
                        <p className="mt-1 text-xs text-slate-500">{formaterFCFA(c.montant)} · {formaterDate(c.dateCreation)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination pagination={d.pagination} onPage={changerPage} />
            </>
          )}
        </EtatsRequete>
      </Carte>
    </>
  );
}
