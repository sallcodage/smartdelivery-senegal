import { useEffect, useState } from 'react';
import { Calculator, Save } from 'lucide-react';
import { Alerte, Carte, EnTetePage } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import { Champ } from '../../components/ui/Champ';
import Bouton from '../../components/ui/Bouton';
import { useRequete } from '../../hooks/useRequete';
import { useValeurDifferee } from '../../hooks/useValeurDifferee';
import { adminApi } from '../../api/adminApi';
import { erreursDesChamps, messageErreur } from '../../api/client';
import { formaterDateHeure, formaterFCFA } from '../../utils/format';

const CHAMPS = [
  { nom: 'prixBase', libelle: 'Prix de base (FCFA)', aide: 'Ajouté à chaque livraison' },
  { nom: 'prixParKm', libelle: 'Prix par kilomètre (FCFA)', aide: 'Multiplié par la distance du trajet' },
  { nom: 'montantMinimum', libelle: 'Montant minimum (FCFA)', aide: 'Aucune livraison en dessous de ce prix' },
  { nom: 'arrondi', libelle: 'Arrondi (FCFA)', aide: 'Montant arrondi au multiple supérieur' },
  { nom: 'partLivreurPourcentage', libelle: 'Part du livreur (%)', aide: 'Pourcentage du montant reversé au livreur' },
];

function Formulaire({ initial, onEnregistre }) {
  const [f, setF] = useState(() => Object.fromEntries(CHAMPS.map((c) => [c.nom, String(initial[c.nom])])));
  const [exemples, setExemples] = useState(null);
  const [erreurs, setErreurs] = useState({});
  const [message, setMessage] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const valeurs = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Number(v)]));
  const cle = useValeurDifferee(JSON.stringify(valeurs), 400);

  // Aperçu calculé par le serveur (formule unique), sans rien enregistrer
  useEffect(() => {
    adminApi.simulerTarification(JSON.parse(cle)).then(setExemples).catch(() => setExemples(null));
  }, [cle]);

  async function enregistrer(e) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    setErreurs({});
    try {
      onEnregistre(await adminApi.modifierTarification(valeurs));
      setMessage({ type: 'succes', texte: 'Tarification enregistrée : elle s\'applique aux nouvelles commandes.' });
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setMessage({ type: 'erreur', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Carte className="p-5">
        <h2 className="text-base font-semibold text-slate-900">Tarification des livraisons</h2>
        <p className="mt-1 text-sm text-slate-500">Montant = max(minimum, arrondi supérieur de (prix de base + distance × prix par km))</p>
        <form onSubmit={enregistrer} noValidate className="mt-5 space-y-4">
          {message && <Alerte type={message.type}>{message.texte}</Alerte>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CHAMPS.map((c) => (
              <Champ key={c.nom} label={c.libelle} type="number" min="0" step={c.nom === 'partLivreurPourcentage' ? '0.5' : '1'} requis aide={c.aide}
                value={f[c.nom]} onChange={(e) => setF((a) => ({ ...a, [c.nom]: e.target.value }))} erreur={erreurs[c.nom]} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500">Dernière modification : {formaterDateHeure(initial.dateModification)}</p>
            <Bouton type="submit" icone={Save} chargement={envoi}>Enregistrer</Bouton>
          </div>
        </form>
      </Carte>
      <Carte className="p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Calculator className="h-5 w-5 text-vert-600" aria-hidden="true" />Aperçu des prix</h2>
        <p className="mt-1 text-sm text-slate-500">Calculé par le serveur avec les valeurs saisies, avant enregistrement.</p>
        {exemples ? (
          <table className="mt-4 w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Distance</th><th className="py-2 text-right">Prix client</th><th className="py-2 text-right">Part livreur</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {exemples.map((x) => <tr key={x.distanceKm}><td className="py-2.5">{x.distanceKm} km</td><td className="py-2.5 text-right font-semibold text-slate-900">{formaterFCFA(x.montant)}</td><td className="py-2.5 text-right text-slate-600">{formaterFCFA(x.partLivreur)}</td></tr>)}
            </tbody>
          </table>
        ) : <p className="mt-6 text-sm text-slate-400">Saisissez des valeurs valides pour voir l'aperçu.</p>}
      </Carte>
    </div>
  );
}

export default function Parametres() {
  const requete = useRequete(() => adminApi.tarification(), []);
  return (
    <>
      <EnTetePage titre="Paramètres" sousTitre="Règles appliquées automatiquement par la plateforme." />
      <EtatsRequete requete={requete}>{(p) => <Formulaire initial={p} onEnregistre={requete.setDonnees} />}</EtatsRequete>
    </>
  );
}
