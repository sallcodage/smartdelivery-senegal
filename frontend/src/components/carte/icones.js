import L from 'leaflet';

// Épingles en SVG (évite les images par défaut de Leaflet, mal gérées par les bundlers)
function epingle(couleur, lettre) {
  return L.divIcon({
    className: '',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
    html: `<svg width="32" height="42" viewBox="0 0 32 42" aria-hidden="true">
      <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="${couleur}" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="15.5" r="8.5" fill="#fff"/>
      <text x="16" y="19.8" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="${couleur}">${lettre}</text>
    </svg>`,
  });
}

export const ICONE_DEPART = epingle('#16a34a', 'A');
export const ICONE_ARRIVEE = epingle('#dc2626', 'B');

export function iconeLivreur() {
  return L.divIcon({
    className: 'marqueur-livreur', // déplacement animé (voir index.css)
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div style="width:38px;height:38px;border-radius:50%;background:#1d4ed8;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 7.5M5.5 17.5 9 10h6l3.5 7.5"/></svg></div>`,
  });
}

// Petit point vert : livreur disponible (carte admin)
export const ICONE_LIVREUR_DISPONIBLE = L.divIcon({
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
});
