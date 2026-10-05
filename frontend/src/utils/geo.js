// Distance à vol d'oiseau (Haversine), identique au calcul du backend
const RAYON_TERRE_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function distanceKm(a, b) {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
}

// Estimation indicative de la durée : vitesse moyenne d'un deux-roues en ville (paramètre modifiable)
export const VITESSE_MOYENNE_KMH = 20;
export const dureeEstimeeMinutes = (km) => Math.max(1, Math.round((km / VITESSE_MOYENNE_KMH) * 60));

export const formaterKm = (km) => (km == null ? '—' : `${String(Math.round(km * 10) / 10).replace('.', ',')} km`);
