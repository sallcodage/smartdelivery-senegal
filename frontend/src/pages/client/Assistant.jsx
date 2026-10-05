import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bot, Loader2, RefreshCw, SendHorizontal, ShieldCheck, Sparkles } from 'lucide-react';
import { Carte } from '../../components/ui/Divers';
import { Chargement, EtatErreur } from '../../components/ui/Etats';
import { useRequete } from '../../hooks/useRequete';
import { useAuth } from '../../context/AuthContext';
import { assistantApi } from '../../api/assistantApi';
import { messageErreur } from '../../api/client';
import { formaterDateHeure } from '../../utils/format';

const SUGGESTIONS = [
  'Où est ma commande ?',
  'Combien coûte une livraison du Plateau aux Almadies ?',
  'Quelles zones desservez-vous ?',
  'Comment annuler une commande ?',
];
const LONGUEUR_MAX = 1000;
const PAR_PAGE = 20;

// Mise en forme légère : retours à la ligne, listes « - » et **gras** (sans HTML injecté)
function TexteFormate({ texte }) {
  return texte.split('\n').map((ligne, i) => {
    const morceaux = ligne.split(/(\*\*[^*]+\*\*)/g).map((m, j) => (m.startsWith('**') && m.endsWith('**')
      ? <strong key={j}>{m.slice(2, -2)}</strong> : <Fragment key={j}>{m}</Fragment>));
    return <p key={i} className={ligne.trim().startsWith('- ') || ligne.trim().startsWith('* ') ? 'pl-2' : ''}>{morceaux}{'\u200b'}</p>;
  });
}

function BulleClient({ texte, date }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-vert-500 px-4 py-2.5 text-sm text-white shadow-sm sm:max-w-[70%]">
        <p className="whitespace-pre-wrap break-words">{texte}</p>
        {date && <p className="mt-1 text-right text-[10px] text-white">{formaterDateHeure(date)}</p>}
      </div>
    </div>
  );
}

function BulleAssistant({ echange }) {
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vert-100 text-vert-700"><Bot className="h-4 w-4" aria-hidden="true" /></span>
      <div className="max-w-[85%] space-y-1 sm:max-w-[70%]">
        <div className="space-y-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm">
          <TexteFormate texte={echange.reponse} />
          {echange.commandeNumero && (
            <Link to={`/client/commandes?q=${echange.commandeNumero}`} className="mt-2 inline-flex items-center gap-1 rounded-full bg-vert-50 px-2.5 py-1 text-xs font-medium text-vert-700 hover:bg-vert-100">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Données réelles de {echange.commandeNumero}
            </Link>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 px-1 text-[10px] text-slate-400">
          {echange.dateHeure && formaterDateHeure(echange.dateHeure)}
          {echange.mode === 'secours' && <span className="text-amber-600">· réponse directe de SmartDelivery (sans IA)</span>}
        </p>
        {echange.avertissement && <p className="flex items-start gap-1 px-1 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{echange.avertissement}</p>}
      </div>
    </div>
  );
}

// Écrans « Assistant IA » du prototype
export default function Assistant() {
  const { utilisateur } = useAuth();
  const etat = useRequete(() => assistantApi.etat(), []);
  const [echanges, setEchanges] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurHistorique, setErreurHistorique] = useState('');
  const [pagination, setPagination] = useState(null);
  const [saisie, setSaisie] = useState('');
  const [enAttente, setEnAttente] = useState(null); // question en cours d'envoi
  const [echec, setEchec] = useState(null); // { question, message }
  const fil = useRef(null);
  const champ = useRef(null);

  async function chargerHistorique(page = 1) {
    setErreurHistorique('');
    try {
      const d = await assistantApi.historique({ page, limite: PAR_PAGE });
      const anciens = [...d.donnees].reverse(); // l'API renvoie du plus récent au plus ancien
      setEchanges((actuels) => (page === 1 ? anciens : [...anciens, ...actuels]));
      setPagination(d.pagination);
    } catch (err) {
      setErreurHistorique(messageErreur(err));
    } finally {
      setChargement(false);
    }
  }
  useEffect(() => { chargerHistorique(1); }, []);

  // Défilement automatique vers le dernier message
  useEffect(() => { fil.current?.scrollTo({ top: fil.current.scrollHeight, behavior: 'smooth' }); }, [echanges.length, enAttente, echec]);

  async function envoyer(question) {
    const texte = question.trim();
    if (!texte || enAttente) return;
    setEchec(null);
    setSaisie('');
    setEnAttente(texte);
    try {
      const r = await assistantApi.poser(texte);
      setEchanges((e) => [...e, { ...r.conversation, mode: r.mode, avertissement: r.avertissement }]);
    } catch (err) {
      setEchec({ question: texte, message: messageErreur(err, "L'assistant n'a pas pu répondre. Réessayez.") });
    } finally {
      setEnAttente(null);
      champ.current?.focus();
    }
  }

  const disponible = etat.donnees?.disponible;
  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-[28rem] flex-col lg:h-[calc(100dvh-8rem)]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-vert-500 text-white"><Bot className="h-6 w-6" aria-hidden="true" /></span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Assistant IA</h1>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-2 w-2 rounded-full ${disponible ? 'bg-vert-500' : etat.donnees ? 'bg-amber-500' : 'bg-slate-300'}`} />
            {!etat.donnees ? 'Vérification…' : disponible ? 'IA connectée · réponses vérifiées sur vos données' : 'Mode simplifié : réponses directes de SmartDelivery'}
          </p>
        </div>
      </div>

      <Carte className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={fil} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-6" aria-live="polite">
          {chargement && <Chargement texte="Chargement de la conversation…" />}
          {erreurHistorique && <EtatErreur message={erreurHistorique} onReessayer={() => chargerHistorique(1)} />}
          {pagination && pagination.page < pagination.pages && (
            <div className="text-center"><button type="button" onClick={() => chargerHistorique(pagination.page + 1)} className="text-xs font-medium text-vert-600 hover:underline">Afficher les messages précédents</button></div>
          )}
          {!chargement && !erreurHistorique && echanges.length === 0 && !enAttente && (
            <div className="mx-auto max-w-md py-6 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-vert-500" aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-900">Bonjour {utilisateur.prenom}, comment puis-je vous aider ?</p>
              <p className="mt-1 text-sm text-slate-500">Je consulte vos vraies commandes et j'utilise les tarifs officiels de SmartDelivery. Je ne devine jamais une information.</p>
            </div>
          )}
          {echanges.map((e) => (
            <Fragment key={e.id}>
              <BulleClient texte={e.question} date={e.dateHeure} />
              <BulleAssistant echange={e} />
            </Fragment>
          ))}
          {enAttente && (
            <>
              <BulleClient texte={enAttente} />
              <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vert-100 text-vert-700"><Bot className="h-4 w-4" aria-hidden="true" /></span>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> L'assistant consulte vos données…
              </div>
            </>
          )}
          {echec && (
            <>
              <BulleClient texte={echec.question} />
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />{echec.message}
                <button type="button" onClick={() => envoyer(echec.question)} className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Réessayer</button>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white p-3">
          {echanges.length < 2 && !enAttente && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => envoyer(s)} className="shrink-0 rounded-full border border-vert-200 bg-vert-50 px-3 py-1.5 text-xs font-medium text-vert-700 hover:bg-vert-100">{s}</button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); envoyer(saisie); }} className="flex items-end gap-2">
            <label htmlFor="question" className="sr-only">Votre message</label>
            <textarea
              id="question" ref={champ} rows={1} value={saisie} maxLength={LONGUEUR_MAX} disabled={Boolean(enAttente)}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(saisie); } }}
              placeholder="Écrivez votre message…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-vert-500 focus:outline-none focus:ring-3 focus:ring-vert-100 disabled:bg-slate-50"
            />
            <button type="submit" disabled={!saisie.trim() || Boolean(enAttente)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vert-500 text-white hover:bg-vert-600 disabled:bg-vert-200" aria-label="Envoyer">
              <SendHorizontal className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-1.5 flex justify-between px-1 text-[10px] text-slate-400">
            <span>Entrée pour envoyer · Maj + Entrée pour aller à la ligne</span>
            {saisie.length > LONGUEUR_MAX - 100 && <span>{saisie.length} / {LONGUEUR_MAX}</span>}
          </p>
        </div>
      </Carte>
    </div>
  );
}
