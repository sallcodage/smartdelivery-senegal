import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup } from 'react-leaflet';
import { Bike, MapPinOff, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Carte, EnTetePage, Interrupteur } from '../../components/ui/Divers';
import { EtatsRequete } from '../../components/ui/Etats';
import StatutCommande from '../../components/commandes/StatutCommande';
import FondDeCarte from '../../components/carte/FondDeCarte';
import { ICONE_ARRIVEE, ICONE_DEPART, ICONE_LIVREUR_DISPONIBLE, iconeLivreur } from '../../components/carte/icones';
import { useRequete } from '../../hooks/useRequete';
import { adminApi } from '../../api/adminApi';
import { CENTRE_DAKAR } from '../../config/commandes';
import { formaterRelatif } from '../../utils/format';
import { distanceKm, dureeEstimeeMinutes, formaterKm } from '../../utils/geo';

const ICONE_LIVREUR = iconeLivreur();
const ACTUALISATION_MS = 10000;
const pt = (p) => [p.latitude, p.longitude];
const POSITION_ANCIENNE_MS = 15 * 60 * 1000;
const estAncienne = (pos) => Date.now() - new Date(pos.dateHeure).getTime() > POSITION_ANCIENNE_MS;

function InfosLivraison({ l }) {
  const restant = l.positionLivreur ? distanceKm(l.positionLivreur, l.arrivee) : null;
  return (
    <div className="min-w-48 space-y-1 text-sm">
      <p className="font-bold text-slate-900">{l.numero}</p>
      <p><span className="text-slate-500">Livreur :</span> {l.livreur.nom} · {l.livreur.telephone}</p>
      <p><span className="text-slate-500">Client :</span> {l.client.nom}</p>
      <p className="font-semibold text-blue-700">{l.libelleStatut}{l.statut === 'EN_COURS' && restant != null && ` · ${formaterKm(restant)} · ≈ ${dureeEstimeeMinutes(restant)} min restantes`}</p>
      {l.positionLivreur && (
        <p className="text-xs text-slate-500">
          {l.positionLivreur.source === 'LIVRAISON' ? 'Position GPS' : 'Dernière position connue'} {formaterRelatif(l.positionLivreur.dateHeure)}
        </p>
      )}
      <Link to={`/admin/commandes/${l.id}`} className="font-semibold text-vert-600">Voir la commande →</Link>
    </div>
  );
}

// Écran « Carte des livraisons (suivi temps réel) » du prototype
export default function LivraisonsAdmin() {
  const livraisons = useRequete(() => adminApi.livraisonsActives(), []);
  const [afficherDisponibles, setAfficherDisponibles] = useState(true);
  const disponibles = useRequete(() => adminApi.livreurs({ disponible: true }), []);
  const [selection, setSelection] = useState(null);
  const [carte, setCarte] = useState(null);
  const marqueurs = useRef({});
  const cadre = useRef(false);

  useEffect(() => {
    const m = setInterval(() => { livraisons.recharger(true); disponibles.recharger(true); }, ACTUALISATION_MS);
    return () => clearInterval(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liste = livraisons.donnees || [];
  const localisees = liste.filter((l) => l.positionLivreur);
  const libres = (disponibles.donnees || []).filter((l) => l.etat === 'DISPONIBLE' && l.latitudeActuelle != null);

  // Cadrage automatique sur l'ensemble des livreurs au premier chargement
  useEffect(() => {
    if (!carte || cadre.current || !livraisons.donnees) return;
    const points = [...localisees.map((l) => pt(l.positionLivreur)), ...libres.map((l) => [l.latitudeActuelle, l.longitudeActuelle])];
    if (points.length) carte.fitBounds(points, { padding: [60, 60], maxZoom: 14 });
    cadre.current = true;
  }, [carte, livraisons.donnees, disponibles.donnees]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectionner(l) {
    setSelection(l.id);
    if (carte && l.positionLivreur) {
      carte.flyTo(pt(l.positionLivreur), 15, { duration: 0.6 });
      setTimeout(() => marqueurs.current[l.id]?.openPopup(), 650);
    } else if (carte) {
      carte.fitBounds([pt(l.depart), pt(l.arrivee)], { padding: [60, 60] });
    }
  }
  const choisie = liste.find((l) => l.id === selection);

  return (
    <>
      <EnTetePage
        titre="Carte des livraisons"
        sousTitre={`Suivi en temps réel · actualisation toutes les ${ACTUALISATION_MS / 1000} s`}
        actions={(
          <label className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
            Livreurs disponibles ({libres.length})
            <Interrupteur actif={afficherDisponibles} onChange={setAfficherDisponibles} label="Afficher les livreurs disponibles" />
          </label>
        )}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
        <Carte className="flex max-h-[calc(100vh-13rem)] min-h-64 flex-col">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Livraisons en cours ({liste.length})</h2>
          <EtatsRequete requete={livraisons} estVide={(d) => d.length === 0}
            vide={<div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-500"><Truck className="h-8 w-8 text-slate-300" aria-hidden="true" />Aucune livraison en cours.</div>}>
            {(d) => (
              <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                {d.map((l) => (
                  <li key={l.id}>
                    <button type="button" onClick={() => selectionner(l)} aria-pressed={selection === l.id}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${selection === l.id ? 'bg-vert-50' : ''}`}>
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${l.positionLivreur ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                        {l.positionLivreur ? <Bike className="h-4 w-4" aria-hidden="true" /> : <MapPinOff className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-900">{l.numero}</span><StatutCommande statut={l.statut} /></span>
                        <span className="block truncate text-xs text-slate-600">{l.livreur.nom} · {l.client.nom}</span>
                        <span className={`block text-xs ${l.positionLivreur && estAncienne(l.positionLivreur) ? 'font-medium text-amber-700' : 'text-slate-400'}`}>
                          {!l.positionLivreur ? 'Position inconnue'
                            : `${estAncienne(l.positionLivreur) ? 'Position ancienne' : 'Position'} ${formaterRelatif(l.positionLivreur.dateHeure)}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </EtatsRequete>
        </Carte>

        <div className="relative h-[calc(100vh-13rem)] min-h-96 overflow-hidden rounded-xl border border-slate-200">
          <MapContainer ref={setCarte} center={CENTRE_DAKAR} zoom={12} className="h-full w-full">
            <FondDeCarte />
            {localisees.map((l) => (
              <Marker key={l.id} position={pt(l.positionLivreur)} icon={ICONE_LIVREUR} zIndexOffset={1000} title={`${l.livreur.nom}, livraison ${l.numero}`}
                ref={(m) => { if (m) marqueurs.current[l.id] = m; }} eventHandlers={{ click: () => setSelection(l.id) }}>
                <Popup><InfosLivraison l={l} /></Popup>
              </Marker>
            ))}
            {choisie && (
              <>
                <Marker position={pt(choisie.depart)} icon={ICONE_DEPART} title={`Départ : ${choisie.depart.adresse}`}><Popup><strong>Départ</strong><br />{choisie.depart.adresse}</Popup></Marker>
                <Marker position={pt(choisie.arrivee)} icon={ICONE_ARRIVEE} title={`Arrivée : ${choisie.arrivee.adresse}`}><Popup><strong>Arrivée</strong><br />{choisie.arrivee.adresse}</Popup></Marker>
                <Polyline positions={[choisie.positionLivreur ? pt(choisie.positionLivreur) : pt(choisie.depart), pt(choisie.arrivee)]} pathOptions={{ color: '#16a34a', weight: 3, dashArray: '8 8' }} />
              </>
            )}
            {afficherDisponibles && libres.map((l) => (
              <Marker key={`dispo-${l.id}`} position={[l.latitudeActuelle, l.longitudeActuelle]} icon={ICONE_LIVREUR_DISPONIBLE} title={`${l.prenom} ${l.nom}, disponible`}>
                <Popup><strong>{l.prenom} {l.nom}</strong><br />Disponible · {l.telephone}<br /><Link to={`/admin/livreurs/${l.id}`}>Voir la fiche →</Link></Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap gap-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-700" />Livreur en livraison</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-vert-500" />Livreur disponible</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />Arrivée</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-vert-500" />Trajet restant</span>
          </div>
        </div>
      </div>
    </>
  );
}
