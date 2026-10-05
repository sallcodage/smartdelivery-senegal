import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import FondDeCarte from './FondDeCarte';
import { ICONE_ARRIVEE, ICONE_DEPART } from './icones';

function Cadrage({ points }) {
  const carte = useMap();
  const cle = JSON.stringify(points);
  useEffect(() => {
    if (points.length === 1) carte.setView(points[0], 15);
    if (points.length > 1) carte.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  return null;
}

// Carte en lecture seule : départ (A), arrivée (B) et ligne entre les deux.
export default function CarteTrajet({ depart, arrivee, hauteur = 'h-72', children, pointsSupplementaires = [] }) {
  const a = [depart.latitude, depart.longitude];
  const b = [arrivee.latitude, arrivee.longitude];
  return (
    <div className={`${hauteur} overflow-hidden rounded-xl border border-slate-200`}>
      <MapContainer center={a} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <FondDeCarte />
        <Marker position={a} icon={ICONE_DEPART} title={`Départ : ${depart.adresse}`}><Popup><strong>Départ</strong><br />{depart.adresse}</Popup></Marker>
        <Marker position={b} icon={ICONE_ARRIVEE} title={`Arrivée : ${arrivee.adresse}`}><Popup><strong>Arrivée</strong><br />{arrivee.adresse}</Popup></Marker>
        <Polyline positions={[a, b]} pathOptions={{ color: '#16a34a', weight: 4, dashArray: '8 8' }} />
        {children}
        <Cadrage points={[a, b, ...pointsSupplementaires]} />
      </MapContainer>
    </div>
  );
}
