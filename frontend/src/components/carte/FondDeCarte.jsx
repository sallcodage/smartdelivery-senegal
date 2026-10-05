import { TileLayer } from 'react-leaflet';

// Tuiles OpenStreetMap (attribution obligatoire)
export default function FondDeCarte() {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>'
      maxZoom={19}
    />
  );
}
