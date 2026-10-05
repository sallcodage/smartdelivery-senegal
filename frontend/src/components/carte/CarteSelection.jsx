import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import FondDeCarte from './FondDeCarte';
import { ICONE_ARRIVEE, ICONE_DEPART } from './icones';
import { CENTRE_DAKAR } from '../../config/commandes';

function Clics({ onClic }) {
  useMapEvents({ click: (e) => onClic(e.latlng) });
  return null;
}

// Recentre la carte quand un point est choisi par la recherche (pas lors d'un clic)
function Recentrage({ cible }) {
  const carte = useMap();
  useEffect(() => { if (cible) carte.flyTo([cible.latitude, cible.longitude], 16, { duration: 0.6 }); }, [cible, carte]);
  return null;
}

const position = (p) => (p?.latitude != null ? [p.latitude, p.longitude] : null);

// Carte interactive : un clic place le point actif (départ ou arrivée) ; les épingles sont déplaçables.
export default function CarteSelection({ depart, arrivee, pointActif, onPlacer, cibleRecentrage }) {
  const a = position(depart);
  const b = position(arrivee);
  const deplacer = (type) => ({ dragend: (e) => onPlacer(type, e.target.getLatLng()) });
  return (
    <div className="relative h-80 overflow-hidden rounded-xl border border-slate-200 lg:h-full lg:min-h-[28rem]">
      <MapContainer center={a || b || CENTRE_DAKAR} zoom={12} className="h-full w-full" style={{ cursor: 'crosshair' }}>
        <FondDeCarte />
        <Clics onClic={(latlng) => onPlacer(pointActif, latlng)} />
        {a && <Marker position={a} icon={ICONE_DEPART} title="Point de départ (déplaçable)" draggable eventHandlers={deplacer('depart')} />}
        {b && <Marker position={b} icon={ICONE_ARRIVEE} title="Point d'arrivée (déplaçable)" draggable eventHandlers={deplacer('arrivee')} />}
        {a && b && <Polyline positions={[a, b]} pathOptions={{ color: '#16a34a', weight: 4, dashArray: '8 8' }} />}
        <Recentrage cible={cibleRecentrage} />
      </MapContainer>
      <p className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-slate-700 shadow">
        Cliquez sur la carte pour placer {pointActif === 'depart' ? 'le départ (A)' : "l'arrivée (B)"}
      </p>
    </div>
  );
}
