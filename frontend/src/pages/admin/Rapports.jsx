import { useEffect, useState } from 'react';
import { BarChart3, Download, Eye, ExternalLink, FileText, Loader2, Truck, Wallet } from 'lucide-react';
import { Alerte, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete, EtatVide } from '../../components/ui/Etats';
import { Champ } from '../../components/ui/Champ';
import Bouton from '../../components/ui/Bouton';
import Fenetre from '../../components/ui/Fenetre';
import Pagination from '../../components/ui/Pagination';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { erreursDesChamps, messageErreur } from '../../api/client';
import { formaterDate, formaterDateHeure } from '../../utils/format';

const TYPES = [
  { valeur: 'ACTIVITE_GLOBALE', titre: 'Activité globale', texte: 'Commandes, livraisons, taux de réussite, délais, zones, colis, meilleurs livreurs.', icone: BarChart3 },
  { valeur: 'PERFORMANCE_LIVREURS', titre: 'Performance des livreurs', texte: 'Livraisons, acceptations, refus, temps moyen, distance, note et gains par livreur.', icone: Truck },
  { valeur: 'FINANCIER', titre: 'Financier', texte: "Chiffre d'affaires, panier moyen, parts livreurs et plateforme, répartition par zone et colis.", icone: Wallet },
];

// Dakar est à UTC+0 : les dates ISO correspondent aux dates locales
const iso = (d) => d.toISOString().slice(0, 10);
function periodePredefinie(cle) {
  const auj = new Date();
  const debut = new Date(auj);
  if (cle === '7j') debut.setUTCDate(auj.getUTCDate() - 6);
  if (cle === '30j') debut.setUTCDate(auj.getUTCDate() - 29);
  if (cle === 'mois') debut.setUTCDate(1);
  if (cle === 'annee') { debut.setUTCMonth(0); debut.setUTCDate(1); }
  if (cle === 'mois-precedent') {
    const fin = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), 0));
    return { debut: iso(new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), 1))), fin: iso(fin) };
  }
  return { debut: iso(debut), fin: iso(auj) };
}
const PERIODES = [
  { cle: '7j', libelle: '7 derniers jours' }, { cle: '30j', libelle: '30 derniers jours' },
  { cle: 'mois', libelle: 'Mois en cours' }, { cle: 'mois-precedent', libelle: 'Mois précédent' }, { cle: 'annee', libelle: 'Année en cours' },
];
const taille = (o) => (o == null ? '—' : o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);

function Apercu({ rapport, onFermer }) {
  const [url, setUrl] = useState('');
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    if (!rapport) return undefined;
    let lien = '';
    setUrl(''); setErreur('');
    adminApi.pdfRapport(rapport.id).then((u) => { lien = u; setUrl(u); }).catch((e) => setErreur(messageErreur(e)));
    return () => lien && URL.revokeObjectURL(lien);
  }, [rapport]);
  return (
    <Fenetre ouverte={Boolean(rapport)} titre={rapport ? `${rapport.titre} · ${formaterDate(rapport.periodeDebut)} au ${formaterDate(rapport.periodeFin)}` : ''} onFermer={onFermer} largeur="max-w-5xl">
      {rapport && (
        <div className="space-y-4">
          {rapport.kpis?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rapport.kpis.map((k) => (
                <span key={k.nom} className="rounded-lg bg-vert-50 px-3 py-1.5 text-xs text-vert-800" title={k.description}>
                  {k.nom} : <strong>{Number(k.valeur).toLocaleString('fr-FR')}{k.unite?.startsWith('/') ? '' : ' '}{k.unite}</strong>
                </span>
              ))}
            </div>
          )}
          {erreur && <Alerte type="erreur">{erreur}</Alerte>}
          {!url && !erreur && <div className="flex h-96 items-center justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" aria-label="Chargement du PDF" /></div>}
          {url && <iframe src={url} title={rapport.titre} className="h-[65vh] w-full rounded-lg border border-slate-200" />}
          <div className="flex flex-wrap justify-end gap-3">
            {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4" aria-hidden="true" />Ouvrir dans un onglet</a>}
            <Bouton icone={Download} onClick={() => adminApi.telechargerRapport(rapport)}>Télécharger</Bouton>
          </div>
        </div>
      )}
    </Fenetre>
  );
}

export default function Rapports() {
  const [type, setType] = useState('ACTIVITE_GLOBALE');
  const [periode, setPeriode] = useState('30j');
  const [dates, setDates] = useState(() => periodePredefinie('30j'));
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState(null);
  const [erreurs, setErreurs] = useState({});
  const [page, setPage] = useState(1);
  const [filtre, setFiltre] = useState('');
  const [apercu, setApercu] = useState(null);
  const liste = useRequete(() => adminApi.rapports({ page, limite: 10, type: filtre || undefined }), [page, filtre]);

  const choisirPeriode = (cle) => { setPeriode(cle); setDates(periodePredefinie(cle)); setErreurs({}); };
  const changerDate = (champ, valeur) => { setPeriode('perso'); setDates((d) => ({ ...d, [champ]: valeur })); setErreurs({}); };

  async function generer(e) {
    e.preventDefault();
    if (!dates.debut || !dates.fin || dates.fin < dates.debut) { setErreurs({ periodeFin: 'La date de fin doit suivre la date de début' }); return; }
    setEnvoi(true);
    setMessage(null);
    try {
      const rapport = await adminApi.genererRapport({ type, periodeDebut: dates.debut, periodeFin: dates.fin });
      setMessage({ type: 'succes', texte: `${rapport.titre} généré (${taille(rapport.tailleOctets)}).` });
      setPage(1);
      liste.recharger(true);
      setApercu(rapport);
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setMessage({ type: 'erreur', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <EnTetePage titre="Rapports" sousTitre="Rapports PDF générés à partir des données réelles, avec indicateurs figés à la date de génération." />
      <Carte className="mb-6 p-5">
        <h2 className="text-base font-semibold text-slate-900">Générer un rapport</h2>
        <form onSubmit={generer} noValidate className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="radiogroup" aria-label="Type de rapport">
            {TYPES.map(({ valeur, titre, texte, icone: Icone }) => (
              <button key={valeur} type="button" role="radio" aria-checked={type === valeur} onClick={() => setType(valeur)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${type === valeur ? 'border-vert-500 bg-vert-50 ring-2 ring-vert-100' : 'border-slate-200 hover:border-vert-300'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${type === valeur ? 'bg-vert-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Icone className="h-5 w-5" aria-hidden="true" /></span>
                <span><span className="block text-sm font-semibold text-slate-900">{titre}</span><span className="mt-0.5 block text-xs text-slate-500">{texte}</span></span>
              </button>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Période</p>
            <div className="flex flex-wrap gap-2">
              {PERIODES.map((p) => (
                <button key={p.cle} type="button" aria-pressed={periode === p.cle} onClick={() => choisirPeriode(p.cle)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${periode === p.cle ? 'bg-vert-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{p.libelle}</button>
              ))}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:w-2/3">
              <Champ label="Du" type="date" max={dates.fin || iso(new Date())} value={dates.debut} onChange={(e) => changerDate('debut', e.target.value)} erreur={erreurs.periodeDebut} />
              <Champ label="Au" type="date" min={dates.debut} max={iso(new Date())} value={dates.fin} onChange={(e) => changerDate('fin', e.target.value)} erreur={erreurs.periodeFin} />
            </div>
          </div>
          {message && <Alerte type={message.type}>{message.texte}</Alerte>}
          <Bouton type="submit" icone={FileText} chargement={envoi}>Générer le rapport PDF</Bouton>
        </form>
      </Carte>

      <Carte>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Rapports générés{liste.donnees && ` (${liste.donnees.pagination.total})`}</h2>
          <select value={filtre} onChange={(e) => { setFiltre(e.target.value); setPage(1); }} aria-label="Filtrer par type" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vert-500 focus:outline-none">
            <option value="">Tous les types</option>
            {TYPES.map((t) => <option key={t.valeur} value={t.valeur}>{t.titre}</option>)}
          </select>
        </div>
        <EtatsRequete requete={liste} estVide={(d) => d.donnees.length === 0} vide={<EtatVide icone={FileText} titre="Aucun rapport" texte="Les rapports que vous générez apparaissent ici." />}>
          {(d) => (
            <>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal)">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>{['Rapport', 'Période', 'Généré le', 'Par', 'Taille', 'Actions'].map((t) => <th key={t} scope="col" className={`px-4 py-3 font-semibold ${t === 'Actions' ? 'text-right' : ''}`}>{t}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.donnees.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-red-500" aria-hidden="true" />{r.titre}</span></td>
                        <td className="px-4 py-3 text-slate-600">{formaterDate(r.periodeDebut)} au {formaterDate(r.periodeFin)}</td>
                        <td className="px-4 py-3 text-slate-600">{formaterDateHeure(r.dateGeneration)}</td>
                        <td className="px-4 py-3 text-slate-600">{r.auteur || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{r.disponible ? taille(r.tailleOctets) : <span className="text-red-600">Fichier manquant</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button type="button" disabled={!r.disponible} onClick={async () => setApercu(await adminApi.rapport(r.id))}
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label={`Consulter ${r.titre} du ${formaterDate(r.periodeDebut)}`} title="Consulter"><Eye className="h-4 w-4" /></button>
                            <button type="button" disabled={!r.disponible} onClick={() => adminApi.telechargerRapport(r)}
                              className="rounded-lg p-2 text-vert-600 hover:bg-slate-100 disabled:opacity-30" aria-label={`Télécharger ${r.titre} du ${formaterDate(r.periodeDebut)}`} title="Télécharger"><Download className="h-4 w-4" /></button>
                          </div>
                        </td>
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
      <Apercu rapport={apercu} onFermer={() => setApercu(null)} />
    </>
  );
}
