// Recherche d'adresses avec Nominatim (OpenStreetMap), limitée au Sénégal.
// Service public : 1 requête par seconde maximum. En production, un service dédié serait nécessaire.
// Si internet est indisponible, l'utilisateur peut toujours placer le point directement sur la carte.
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const DELAI_MAX_MS = 6000; // au-delà, on abandonne : l'utilisateur garde les coordonnées GPS

// Annulation par le composant OU après le délai maximal (réseau lent ou absent)
function signalAvecDelai(signal) {
  const delai = AbortSignal.timeout(DELAI_MAX_MS);
  return signal && AbortSignal.any ? AbortSignal.any([signal, delai]) : delai;
}

function simplifier(resultat) {
  const a = resultat.address || {};
  const morceaux = [a.road || a.pedestrian || a.amenity || a.building, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.village || a.county];
  const court = [...new Set(morceaux.filter(Boolean))].join(', ');
  return {
    adresse: court || resultat.display_name.split(',').slice(0, 3).join(',').trim(),
    complete: resultat.display_name,
    latitude: Number(resultat.lat),
    longitude: Number(resultat.lon),
  };
}

export async function rechercherAdresses(texte, signal) {
  const params = new URLSearchParams({ q: texte, format: 'jsonv2', addressdetails: '1', countrycodes: 'sn', limit: '5', 'accept-language': 'fr' });
  const reponse = await fetch(`${NOMINATIM}/search?${params}`, { signal: signalAvecDelai(signal) });
  if (!reponse.ok) throw new Error('Recherche indisponible');
  return (await reponse.json()).map(simplifier);
}

export async function adresseDepuisPosition(latitude, longitude, signal) {
  const params = new URLSearchParams({ lat: latitude, lon: longitude, format: 'jsonv2', addressdetails: '1', 'accept-language': 'fr', zoom: '17' });
  const reponse = await fetch(`${NOMINATIM}/reverse?${params}`, { signal: signalAvecDelai(signal) });
  if (!reponse.ok) throw new Error('Adresse indisponible');
  const donnees = await reponse.json();
  return donnees.error ? null : simplifier(donnees);
}

// Propose la zone SmartDelivery correspondant à une adresse (ex. « …, Pikine, Dakar » → Pikine)
export function zoneDepuisAdresse(texte, zones) {
  const t = (texte || '').toLowerCase();
  const trouvee = zones.filter((z) => z.nom !== 'Dakar').find((z) => t.includes(z.nom.toLowerCase()));
  return trouvee || zones.find((z) => z.nom === 'Dakar' && t.includes('dakar')) || null;
}

export const coordonneesTexte = (p) => `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;
