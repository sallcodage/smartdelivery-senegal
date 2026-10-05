import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import Bouton from './Bouton';

export function Chargement({ texte = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-vert-500" aria-hidden="true" /> {texte}
    </div>
  );
}

export function ChargementPage() {
  return <div className="flex min-h-screen items-center justify-center bg-fond"><Chargement /></div>;
}

export function EtatErreur({ message, onReessayer }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
      <div className="rounded-full bg-red-50 p-3 text-red-500"><AlertTriangle className="h-6 w-6" aria-hidden="true" /></div>
      <p className="max-w-sm text-sm text-slate-600">{message}</p>
      {onReessayer && <Bouton variante="secondaire" taille="sm" icone={RefreshCw} onClick={() => onReessayer()}>Réessayer</Bouton>}
    </div>
  );
}

export function EtatVide({ icone: Icone = Inbox, titre, texte, action }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-400"><Icone className="h-6 w-6" aria-hidden="true" /></div>
      <p className="font-semibold text-slate-700">{titre}</p>
      {texte && <p className="max-w-sm text-sm text-slate-500">{texte}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// Enchaîne automatiquement les quatre états d'une page
export function EtatsRequete({ requete, estVide, vide, children }) {
  if (requete.chargement && !requete.donnees) return <Chargement />;
  if (requete.erreur && !requete.donnees) return <EtatErreur message={requete.erreur} onReessayer={requete.recharger} />;
  if (estVide?.(requete.donnees)) return vide;
  return children(requete.donnees);
}
