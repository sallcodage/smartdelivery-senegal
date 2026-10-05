// Calculs géographiques (formule de Haversine : distance à vol d'oiseau sur la Terre).
const RAYON_TERRE_KM = 6371;
const enRadians = (degres) => (degres * Math.PI) / 180;

function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = enRadians(lat2 - lat1);
  const dLng = enRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(enRadians(lat1)) * Math.cos(enRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(a));
}

// Longueur d'un trajet défini par une suite de positions GPS
function longueurTrajetKm(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceKm(points[i - 1].latitude, points[i - 1].longitude, points[i].latitude, points[i].longitude);
  }
  return total;
}

const arrondir = (n, decimales = 2) => Math.round(n * 10 ** decimales) / 10 ** decimales;

// Estimation indicative de durée : vitesse moyenne d'un deux-roues en ville (même valeur que l'interface)
const VITESSE_MOYENNE_KMH = 20;
const dureeEstimeeMinutes = (km) => Math.max(1, Math.round((km / VITESSE_MOYENNE_KMH) * 60));

module.exports = { distanceKm, longueurTrajetKm, arrondir, VITESSE_MOYENNE_KMH, dureeEstimeeMinutes };
