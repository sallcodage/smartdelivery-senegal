import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup } from 'react-leaflet';
import { LocateFixed, Maximize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import FondDeCarte from './FondDeCarte';
import { ICONE_ARRIVEE, ICONE_DEPART, iconeLivreur } from './icones';

const ICONE_LIVREUR = iconeLivreur();
const pt = (p) => [p.latitude, p.longitude];

// Carte de suivi en direct : départ (A), arrivée (B), livreur, trajet parcouru et reste à parcourir.
export default function CarteSuivi({ depart, arrivee, livreur, trace = [], hauteur = 'h-[60vh] min-h-80', nomLivreur }) {
  const [carte, setCarte] = useState(null);
  const avecLivreur = Boolean(livreur);

  const toutCadrer = () => {
    if (!carte) return;
    carte.fitBounds([pt(depart), pt(arrivee), ...(livreur ? [pt(livreur)] : [])], { padding: [50, 50], maxZoom: 16 });
  };
  // Cadrage au chargement, puis une seconde fois quand la première position du livreur arrive
  useEffect(toutCadrer, [carte, avecLivreur]); // eslint-disable-line react-hooks/exhaustive-deps

  const traceComplete = [...trace, ...(livreur ? [livreur] : [])].map(pt);
  return (
    <div className={`relative ${hauteur} overflow-hidden rounded-xl border border-slate-200`}>
      <MapContainer ref={setCarte} center={pt(depart)} zoom={13} className="h-full w-full">
        <FondDeCarte />
        <Marker position={pt(depart)} icon={ICONE_DEPART} title={`Départ : ${depart.adresse}`}><Popup><strong>Départ</strong><br />{depart.adresse}</Popup></Marker>
        <Marker position={pt(arrivee)} icon={ICONE_ARRIVEE} title={`Arrivée : ${arrivee.adresse}`}><Popup><strong>Arrivée</strong><br />{arrivee.adresse}</Popup></Marker>
        {traceComplete.length > 1 && <Polyline positions={traceComplete} pathOptions={{ color: '#1d4ed8', weight: 5, opacity: 0.85 }} />}
        <Polyline positions={[livreur ? pt(livreur) : pt(depart), pt(arrivee)]} pathOptions={{ color: '#16a34a', weight: 3, dashArray: '8 8' }} />
        {livreur && (
          <Marker position={pt(livreur)} icon={ICONE_LIVREUR} zIndexOffset={1000} title={nomLivreur ? `Position du livreur ${nomLivreur}` : 'Position du livreur'}>
            <Popup><strong>{nomLivreur || 'Livreur'}</strong></Popup>
          </Marker>
        )}
      </MapContainer>
      <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2">
        {livreur && (
          <button type="button" onClick={() => carte?.flyTo(pt(livreur), 16, { duration: 0.6 })} className="rounded-lg bg-white p-2 text-slate-700 shadow hover:bg-slate-50" aria-label="Centrer sur le livreur" title="Centrer sur le livreur">
            <LocateFixed className="h-5 w-5" />
          </button>
        )}
        <button type="button" onClick={toutCadrer} className="rounded-lg bg-white p-2 text-slate-700 shadow hover:bg-slate-50" aria-label="Voir tout le trajet" title="Voir tout le trajet">
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap gap-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-vert-500" />Départ</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />Arrivée</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-700" />Livreur</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-blue-700" />Trajet parcouru</span>
      </div>
    </div>
  );
}
