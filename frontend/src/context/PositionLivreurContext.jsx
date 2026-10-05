// ─────────────────────────────────────────────────────────────────────
//  Partage de la position du livreur (GPS du téléphone / navigateur).
//  • Livraison EN_COURS : envoi sur /commandes/:id/positions (≈ toutes les 10 s)
//  • Disponible sans livraison : envoi sur /livreurs/moi/position (≈ toutes les 60 s),
//    utilisé par l'affectation automatique au livreur le plus proche.
//  Fonctionne sur toutes les pages de l'espace livreur.
// ─────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { commandeApi, livraisonApi } from '../api/commandeApi';
import { livreurApi } from '../api/livreurApi';
import { messageErreur } from '../api/client';
import { useAuth } from './AuthContext';
import { distanceKm } from '../utils/geo';

const PositionContext = createContext(null);

const REGLAGES = {
  livraison: { intervalleMs: 10000, distanceMinM: 15 },
  disponible: { intervalleMs: 60000, distanceMinM: 100 },
};
const PAS_SIMULATION_MS = 3000;

export function PositionLivreurProvider({ children }) {
  const { utilisateur } = useAuth();
  const [livraisonEnCours, setLivraisonEnCours] = useState(null); // { id, arrivee, depart, numero }
  const [etat, setEtat] = useState({ statut: 'inactif', derniere: null, dernierEnvoi: null, erreur: '' });
  const [simulation, setSimulation] = useState(false);
  const dernierEnvoi = useRef({ date: 0, point: null });
  const minuterieSimulation = useRef(null);

  const mode = livraisonEnCours ? 'livraison' : utilisateur?.disponibilite ? 'disponible' : null;

  // Recherche de la livraison en cours (au chargement, toutes les 30 s, et à la demande)
  const actualiser = useCallback(async () => {
    try {
      const { donnees } = await commandeApi.lister({ statut: 'EN_COURS', limite: 1 });
      const c = donnees[0];
      setLivraisonEnCours(c ? { id: c.id, numero: c.numero, depart: c.depart, arrivee: c.arrivee } : null);
    } catch { /* on garde l'état précédent */ }
  }, []);
  useEffect(() => {
    actualiser();
    const m = setInterval(actualiser, 30000);
    return () => clearInterval(m);
  }, [actualiser]);

  const envoyer = useCallback(async (point, force = false) => {
    if (!mode) return;
    const { intervalleMs, distanceMinM } = REGLAGES[mode];
    const precedent = dernierEnvoi.current;
    const deplacementM = precedent.point ? distanceKm(precedent.point, point) * 1000 : Infinity;
    // Limite le nombre d'envois : assez de temps écoulé OU déplacement significatif
    if (!force && Date.now() - precedent.date < intervalleMs && deplacementM < distanceMinM) return;
    dernierEnvoi.current = { date: Date.now(), point };
    try {
      if (mode === 'livraison') await livraisonApi.envoyerPosition(livraisonEnCours.id, point.latitude, point.longitude);
      else await livreurApi.position(point.latitude, point.longitude);
      setEtat((e) => ({ ...e, statut: 'actif', dernierEnvoi: new Date(), erreur: '' }));
    } catch (err) {
      if (err.response?.status === 409) actualiser(); // la livraison n'est plus en cours
      setEtat((e) => ({ ...e, erreur: messageErreur(err) }));
    }
  }, [mode, livraisonEnCours, actualiser]);

  // Suivi GPS réel du navigateur
  useEffect(() => {
    if (!mode || simulation) return undefined;
    if (!navigator.geolocation) {
      setEtat((e) => ({ ...e, statut: 'indisponible', erreur: "La géolocalisation n'est pas disponible sur cet appareil." }));
      return undefined;
    }
    setEtat((e) => ({ ...e, statut: e.statut === 'actif' ? 'actif' : 'attente' }));
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const point = { latitude: coords.latitude, longitude: coords.longitude };
        setEtat((e) => ({ ...e, derniere: point }));
        envoyer(point);
      },
      (err) => setEtat((e) => ({
        ...e,
        statut: err.code === 1 ? 'refuse' : 'erreur',
        erreur: err.code === 1 ? 'Autorisez la localisation dans votre navigateur pour partager votre position.' : 'Position GPS introuvable pour le moment.',
      })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [mode, simulation, envoyer]);

  // Changement de mode (disponible ↔ livraison) : le prochain point est envoyé immédiatement
  useEffect(() => {
    dernierEnvoi.current = { date: 0, point: null };
    if (!mode) setEtat({ statut: 'inactif', derniere: null, dernierEnvoi: null, erreur: '' });
  }, [mode, livraisonEnCours?.id]);

  // Simulation du trajet (démonstration sans se déplacer) : le point avance du départ vers l'arrivée.
  // Les positions passent par la VRAIE API et sont enregistrées en base comme un GPS réel.
  const arreterSimulation = useCallback(() => {
    clearInterval(minuterieSimulation.current);
    setSimulation(false);
  }, []);
  const demarrerSimulation = useCallback(() => {
    if (!livraisonEnCours) return;
    const { depart, arrivee } = livraisonEnCours;
    const origine = etat.derniere || depart;
    const etapes = Math.max(6, Math.round(distanceKm(origine, arrivee) / 0.4)); // un point tous les ~400 m
    let i = 0;
    setSimulation(true);
    clearInterval(minuterieSimulation.current);
    minuterieSimulation.current = setInterval(() => {
      i += 1;
      const t = Math.min(1, i / etapes);
      const point = {
        latitude: origine.latitude + (arrivee.latitude - origine.latitude) * t,
        longitude: origine.longitude + (arrivee.longitude - origine.longitude) * t,
      };
      setEtat((e) => ({ ...e, derniere: point }));
      envoyer(point, true);
      if (t >= 1) arreterSimulation();
    }, PAS_SIMULATION_MS);
  }, [livraisonEnCours, etat.derniere, envoyer, arreterSimulation]);
  useEffect(() => () => clearInterval(minuterieSimulation.current), []);
  useEffect(() => { if (!livraisonEnCours) arreterSimulation(); }, [livraisonEnCours, arreterSimulation]);

  function envoyerMaintenant() {
    if (etat.derniere) { envoyer(etat.derniere, true); return; }
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => { const p = { latitude: coords.latitude, longitude: coords.longitude }; setEtat((e) => ({ ...e, derniere: p })); envoyer(p, true); },
      () => setEtat((e) => ({ ...e, erreur: 'Position GPS introuvable pour le moment.' })),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const valeur = {
    ...etat, mode, livraisonEnCours, actualiser, envoyerMaintenant,
    simulation, demarrerSimulation, arreterSimulation,
    simulationAutorisee: import.meta.env.DEV || import.meta.env.VITE_SIMULATION_GPS === 'true',
  };
  return <PositionContext.Provider value={valeur}>{children}</PositionContext.Provider>;
}

export const usePositionLivreur = () => useContext(PositionContext);
