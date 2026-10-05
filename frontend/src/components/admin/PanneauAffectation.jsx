import { useMemo, useState } from 'react';
import { Bike, Star, Wand2 } from 'lucide-react';
import Bouton from '../ui/Bouton';
import { Alerte } from '../ui/Divers';
import { Chargement, EtatErreur } from '../ui/Etats';
import { EtatLivreur } from './Badges';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { messageErreur } from '../../api/client';
import { libelleVehicule } from '../../config/roles';
import { distanceKm, formaterKm } from '../../utils/geo';

// Choix d'un livreur disponible (trié par distance au point de départ) ou affectation automatique
export default function PanneauAffectation({ commande, onAffectee }) {
  const livreurs = useRequete(() => adminApi.livreurs({ disponible: true }), []);
  const [choix, setChoix] = useState('');
  const [envoi, setEnvoi] = useState('');
  const [erreur, setErreur] = useState('');

  const tries = useMemo(() => (livreurs.donnees || [])
    .map((l) => ({ ...l, distance: l.latitudeActuelle != null ? distanceKm({ latitude: l.latitudeActuelle, longitude: l.longitudeActuelle }, commande.depart) : null }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)), [livreurs.donnees, commande.depart]);

  async function affecter(mode) {
    setEnvoi(mode);
    setErreur('');
    try {
      const resultat = await adminApi.affecter(commande.id, mode === 'auto' ? { automatique: true } : { livreurId: choix });
      onAffectee(resultat);
    } catch (err) {
      setErreur(messageErreur(err));
      livreurs.recharger(true);
      setEnvoi('');
    }
  }

  if (livreurs.chargement) return <Chargement texte="Recherche des livreurs disponibles…" />;
  if (livreurs.erreur) return <EtatErreur message={livreurs.erreur} onReessayer={livreurs.recharger} />;
  return (
    <div className="space-y-3">
      {erreur && <Alerte type="erreur">{erreur}</Alerte>}
      {tries.length === 0 ? (
        <Alerte type="avertissement">Aucun livreur disponible pour le moment. Les livreurs doivent activer leur disponibilité.</Alerte>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto" role="radiogroup" aria-label="Livreurs disponibles">
          {tries.map((l) => (
            <li key={l.id}>
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${choix === l.id ? 'border-vert-500 bg-vert-50' : 'border-slate-200 hover:border-vert-300'}`}>
                <input type="radio" name="livreur" value={l.id} checked={choix === l.id} onChange={() => setChoix(l.id)} className="accent-vert-500" />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vert-100 text-vert-700"><Bike className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{l.prenom} {l.nom}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    {libelleVehicule(l.vehicule)}
                    <span>{l.telephone}</span>
                    {l.noteMoyenne && <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />{String(l.noteMoyenne).replace('.', ',')}</span>}
                    <span>{l.distance != null ? `à ${formaterKm(l.distance)} du départ` : 'position inconnue'}</span>
                  </span>
                </span>
                <EtatLivreur etat={l.etat} />
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Bouton variante="secondaire" icone={Wand2} chargement={envoi === 'auto'} disabled={Boolean(envoi)} onClick={() => affecter('auto')}>Automatique (le plus proche)</Bouton>
        <Bouton chargement={envoi === 'manuel'} disabled={!choix || Boolean(envoi)} onClick={() => affecter('manuel')}>Affecter le livreur choisi</Bouton>
      </div>
    </div>
  );
}
