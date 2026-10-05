import { useEffect, useRef, useState } from 'react';
import { Crosshair, Info, Weight } from 'lucide-react';
import CarteSelection from '../carte/CarteSelection';
import ChampAdresse from '../carte/ChampAdresse';
import { Champ, ChampSelect } from '../ui/Champ';
import Bouton from '../ui/Bouton';
import { Alerte, Carte } from '../ui/Divers';
import { Chargement, EtatErreur } from '../ui/Etats';
import { useRequete } from '../../hooks/useRequete';
import { referenceApi } from '../../api/referenceApi';
import { commandeApi } from '../../api/commandeApi';
import { erreursDesChamps, messageErreur } from '../../api/client';
import { TYPES_COLIS } from '../../config/commandes';
import { adresseDepuisPosition, coordonneesTexte, zoneDepuisAdresse } from '../../utils/geocodage';
import { formaterFCFA } from '../../utils/format';

const POINT_VIDE = { adresse: '', latitude: null, longitude: null };
const estPlace = (p) => p.latitude != null && p.longitude != null;

function depuisCommande(c) {
  if (!c) return { depart: POINT_VIDE, arrivee: POINT_VIDE, zoneId: '', typeColis: '', poidsKg: '' };
  return { depart: c.depart, arrivee: c.arrivee, zoneId: String(c.zone.id), typeColis: c.typeColis, poidsKg: String(c.poidsKg) };
}

function valider(f) {
  const e = {};
  if (!f.depart.adresse.trim()) e.adresseDepart = 'Adresse de départ obligatoire';
  else if (!estPlace(f.depart)) e.adresseDepart = 'Placez le point de départ sur la carte';
  if (!f.arrivee.adresse.trim()) e.adresseArrivee = "Adresse d'arrivée obligatoire";
  else if (!estPlace(f.arrivee)) e.adresseArrivee = "Placez le point d'arrivée sur la carte";
  if (!f.zoneId) e.zoneId = 'Choisissez la zone de livraison';
  if (!f.typeColis) e.typeColis = 'Choisissez le type de colis';
  if (!(Number(f.poidsKg) > 0)) e.poidsKg = 'Poids invalide';
  return e;
}

export default function FormulaireCommande({ commande = null, libelleBouton, onSoumettre }) {
  const zones = useRequete(() => referenceApi.zones(), []);
  const [f, setF] = useState(() => depuisCommande(commande));
  const [pointActif, setPointActif] = useState('depart');
  const [cible, setCible] = useState(null);
  const [estimation, setEstimation] = useState(null);
  const [calcul, setCalcul] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [erreurGlobale, setErreurGlobale] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [localisation, setLocalisation] = useState('');
  const geocodage = useRef({});

  const maj = (champ, valeur) => {
    setF((a) => ({ ...a, [champ]: valeur }));
    setErreurs((a) => ({ ...a, [champ]: undefined }));
  };

  // Le prix est recalculé par le serveur dès que les deux points sont placés
  const cleTrajet = [f.depart.latitude, f.depart.longitude, f.arrivee.latitude, f.arrivee.longitude].join();
  useEffect(() => {
    if (!estPlace(f.depart) || !estPlace(f.arrivee)) { setEstimation(null); return undefined; }
    let annule = false;
    setCalcul(true);
    const minuterie = setTimeout(() => {
      commandeApi.estimer({
        latitudeDepart: f.depart.latitude, longitudeDepart: f.depart.longitude,
        latitudeArrivee: f.arrivee.latitude, longitudeArrivee: f.arrivee.longitude,
      }).then((e) => !annule && setEstimation(e)).catch(() => !annule && setEstimation(null)).finally(() => !annule && setCalcul(false));
    }, 350);
    return () => { annule = true; clearTimeout(minuterie); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleTrajet]);

  function suggererZone(type, texte) {
    if (type !== 'arrivee' || !zones.donnees) return;
    const zone = zoneDepuisAdresse(texte, zones.donnees);
    if (zone) {
      setF((a) => (a.zoneId ? a : { ...a, zoneId: String(zone.id) }));
      setErreurs((a) => ({ ...a, zoneId: undefined }));
    }
  }

  // Clic ou déplacement sur la carte : coordonnées immédiates, adresse complétée si le service répond
  function placer(type, { lat, lng }) {
    const champErreur = type === 'depart' ? 'adresseDepart' : 'adresseArrivee';
    const provisoire = `Point GPS ${coordonneesTexte({ latitude: lat, longitude: lng })}`;
    // Adresse provisoire immédiate (coordonnées), remplacée par le nom de rue si le service répond
    setF((a) => ({
      ...a,
      [type]: { adresse: !a[type].adresse || a[type].adresse.startsWith('Point GPS') ? provisoire : a[type].adresse, latitude: lat, longitude: lng },
    }));
    setErreurs((a) => ({ ...a, [champErreur]: undefined }));
    if (type === 'depart' && !estPlace(f.arrivee)) setPointActif('arrivee');

    geocodage.current[type]?.abort();
    const controle = new AbortController();
    geocodage.current[type] = controle;
    adresseDepuisPosition(lat, lng, controle.signal)
      .then((r) => {
        if (!r) return;
        setF((a) => ({ ...a, [type]: { ...a[type], adresse: r.adresse } }));
        suggererZone(type, r.complete);
      })
      .catch(() => { /* service indisponible : l'adresse provisoire (coordonnées) reste modifiable */ });
  }

  function choisirSuggestion(type, s) {
    setF((a) => ({ ...a, [type]: { adresse: s.adresse, latitude: s.latitude, longitude: s.longitude } }));
    setErreurs((a) => ({ ...a, [type === 'depart' ? 'adresseDepart' : 'adresseArrivee']: undefined }));
    setCible({ ...s });
    suggererZone(type, s.complete);
    if (type === 'depart') setPointActif('arrivee');
  }

  function utiliserMaPosition() {
    if (!navigator.geolocation) { setLocalisation("La géolocalisation n'est pas disponible sur cet appareil."); return; }
    setLocalisation('Localisation en cours…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalisation('');
        placer('depart', { lat: coords.latitude, lng: coords.longitude });
        setCible({ latitude: coords.latitude, longitude: coords.longitude });
      },
      () => setLocalisation("Position refusée ou indisponible. Placez le départ sur la carte."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function soumettre(e) {
    e.preventDefault();
    const locales = valider(f);
    setErreurs(locales);
    setErreurGlobale('');
    if (Object.keys(locales).length) return;
    setEnvoi(true);
    try {
      await onSoumettre({
        adresseDepart: f.depart.adresse.trim(), latitudeDepart: f.depart.latitude, longitudeDepart: f.depart.longitude,
        adresseArrivee: f.arrivee.adresse.trim(), latitudeArrivee: f.arrivee.latitude, longitudeArrivee: f.arrivee.longitude,
        zoneId: Number(f.zoneId), typeColis: f.typeColis, poidsKg: Number(f.poidsKg),
      });
    } catch (err) {
      setErreurs(erreursDesChamps(err));
      setErreurGlobale(messageErreur(err));
      setEnvoi(false);
    }
  }

  if (zones.chargement) return <Chargement />;
  if (zones.erreur) return <EtatErreur message={zones.erreur} onReessayer={zones.recharger} />;

  return (
    <form onSubmit={soumettre} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Carte className="space-y-5 p-5 lg:col-start-1">
        <h2 className="text-base font-semibold text-slate-900">Trajet</h2>
        <ChampAdresse
          label="Adresse de départ" couleur="bg-vert-500" valeur={f.depart.adresse} place={estPlace(f.depart)}
          onTexte={(t) => maj('depart', { ...f.depart, adresse: t })} onChoix={(s) => choisirSuggestion('depart', s)}
          actif={pointActif === 'depart'} onActiver={() => setPointActif('depart')} erreur={erreurs.adresseDepart}
        />
        <div className="-mt-2">
          <button type="button" onClick={utiliserMaPosition} className="inline-flex items-center gap-1.5 text-xs font-medium text-vert-600 hover:underline">
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" /> Utiliser ma position actuelle
          </button>
          {localisation && <p className="mt-1 text-xs text-slate-500">{localisation}</p>}
        </div>
        <ChampAdresse
          label="Adresse d'arrivée" couleur="bg-red-600" valeur={f.arrivee.adresse} place={estPlace(f.arrivee)}
          onTexte={(t) => maj('arrivee', { ...f.arrivee, adresse: t })} onChoix={(s) => choisirSuggestion('arrivee', s)}
          actif={pointActif === 'arrivee'} onActiver={() => setPointActif('arrivee')} erreur={erreurs.adresseArrivee}
        />
      </Carte>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <CarteSelection depart={f.depart} arrivee={f.arrivee} pointActif={pointActif} onPlacer={placer} cibleRecentrage={cible} />
        </div>
      </div>

      <div className="space-y-6 lg:col-start-1">
        <Carte className="space-y-5 p-5">
          <h2 className="text-base font-semibold text-slate-900">Colis</h2>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Type de colis <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Type de colis">
              {TYPES_COLIS.map(({ valeur, libelle, icone: Icone }) => (
                <button
                  key={valeur} type="button" role="radio" aria-checked={f.typeColis === valeur} onClick={() => maj('typeColis', valeur)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition ${f.typeColis === valeur ? 'border-vert-500 bg-vert-50 text-vert-700' : 'border-slate-200 text-slate-600 hover:border-vert-300'}`}
                >
                  <Icone className="h-5 w-5" aria-hidden="true" />{libelle}
                </button>
              ))}
            </div>
            {erreurs.typeColis && <p className="mt-1 text-xs text-red-600">{erreurs.typeColis}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Poids (kg)" type="number" inputMode="decimal" min="0.1" step="0.1" icone={Weight} requis placeholder="Ex. 2,5" value={f.poidsKg} onChange={(e) => maj('poidsKg', e.target.value)} erreur={erreurs.poidsKg} />
            <ChampSelect
              label="Zone de livraison" requis placeholder="Sélectionner" value={f.zoneId} onChange={(e) => maj('zoneId', e.target.value)} erreur={erreurs.zoneId}
              options={zones.donnees.map((z) => ({ valeur: String(z.id), libelle: z.region === z.nom ? z.nom : `${z.nom} (${z.region})` }))}
            />
          </div>
        </Carte>

        <Carte className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Prix de la livraison</p>
              <p className="text-xs text-slate-500">
                {estimation ? `Distance estimée : ${String(estimation.distanceKm).replace('.', ',')} km` : 'Placez le départ et l\'arrivée pour obtenir le prix.'}
              </p>
            </div>
            <p className={`text-2xl font-bold ${estimation ? 'text-vert-600' : 'text-slate-500'}`} aria-live="polite">
              {calcul ? '…' : estimation ? formaterFCFA(estimation.montant) : '— FCFA'}
            </p>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Le prix est calculé automatiquement par SmartDelivery selon la distance du trajet.
          </p>
        </Carte>

        {erreurGlobale && <Alerte type="erreur">{erreurGlobale}</Alerte>}
        <Bouton type="submit" pleineLargeur taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
      </div>
    </form>
  );
}
