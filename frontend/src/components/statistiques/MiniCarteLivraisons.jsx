import { useEffect } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import FondDeCarte from '../carte/FondDeCarte';
import { iconeLivreur } from '../carte/icones';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { CENTRE_DAKAR } from '../../config/commandes';

const ICONE = iconeLivreur();

// Aperçu de la carte des livraisons (tableau de bord), actualisé toutes les 15 s
export default function MiniCarteLivraisons() {
  const requete = useRequete(() => adminApi.livraisonsActives(), []);
  useEffect(() => {
    const m = setInterval(() => requete.recharger(true), 15000);
    return () => clearInterval(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const localisees = (requete.donnees || []).filter((l) => l.positionLivreur);
  return (
    <div className="relative h-64 overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={CENTRE_DAKAR} zoom={11} scrollWheelZoom={false} className="h-full w-full">
        <FondDeCarte />
        {localisees.map((l) => (
          <Marker key={l.id} position={[l.positionLivreur.latitude, l.positionLivreur.longitude]} icon={ICONE} title={`${l.livreur.nom}, livraison ${l.numero}`}>
            <Popup><strong>{l.numero}</strong><br />{l.livreur.nom} · {l.libelleStatut}</Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="absolute bottom-2 left-2 z-[400] rounded bg-white/95 px-2 py-1 text-xs font-medium text-slate-700 shadow">
        {requete.donnees ? `${requete.donnees.length} livraison(s) en cours · ${localisees.length} localisée(s)` : 'Chargement…'}
      </p>
    </div>
  );
}
