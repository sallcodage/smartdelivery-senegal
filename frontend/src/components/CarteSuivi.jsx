import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";


// ======================================================
// RECENTRER AUTOMATIQUEMENT LA CARTE
// ======================================================
function RecentrerCarte({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 14);
    }
  }, [position, map]);

  return null;
}


// ======================================================
// COMPOSANT PRINCIPAL
// ======================================================
function CarteSuivi() {

  // ====================================================
  // RECUPERER L'ID DE LA COMMANDE DEPUIS L'URL
  // /suivi/:commandeId
  // ====================================================
  const { commandeId } = useParams();

  const [suivi, setSuivi] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");


  // ====================================================
  // RECUPERATION DU SUIVI DEPUIS LE BACKEND
  // ====================================================
  useEffect(() => {

    const recupererSuivi = async () => {
      try {
        setErreur("");

        // ================================================
        // VERIFIER L'ID DE LA COMMANDE
        // ================================================
        if (!commandeId) {
          throw new Error(
            "Identifiant de commande manquant."
          );
        }


        // ================================================
        // RECUPERATION DU TOKEN CLIENT
        // ================================================
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error(
            "Aucun token trouvé. Veuillez vous connecter."
          );
        }


        // ================================================
        // APPEL DE L'API
        // ================================================
        const response = await fetch(
          `http://localhost:5000/api/commandes/${commandeId}/suivi`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );


        // ================================================
        // CONVERSION DE LA REPONSE
        // ================================================
        const resultat = await response.json();


        // ================================================
        // VERIFICATION DE LA REPONSE
        // ================================================
        if (!response.ok) {
          throw new Error(
            resultat.message ||
              "Impossible de récupérer le suivi de la livraison."
          );
        }


        // ================================================
        // ENREGISTRER LE SUIVI
        // ================================================
        setSuivi(resultat.data);

      } catch (error) {

        console.error(
          "Erreur suivi livraison :",
          error
        );

        setErreur(error.message);

      } finally {

        setChargement(false);

      }
    };


    // ==================================================
    // PREMIER APPEL
    // ==================================================
    recupererSuivi();


    // ==================================================
    // ACTUALISATION AUTOMATIQUE TOUTES LES 10 SECONDES
    // ==================================================
    const intervalle = setInterval(() => {
      recupererSuivi();
    }, 10000);


    // ==================================================
    // NETTOYAGE DE L'INTERVALLE
    // ==================================================
    return () => {
      clearInterval(intervalle);
    };

  }, [commandeId]);


  // ====================================================
  // CHARGEMENT
  // ====================================================
  if (chargement) {
    return (
      <div className="carte-section">

        <h2>
          Suivi de la livraison
        </h2>

        <p>
          Chargement de la position du livreur...
        </p>

      </div>
    );
  }


  // ====================================================
  // ERREUR
  // ====================================================
  if (erreur) {
    return (
      <div className="carte-section">

        <h2>
          Suivi de la livraison
        </h2>

        <p>
          {erreur}
        </p>

      </div>
    );
  }


  // ====================================================
  // RECUPERATION DES COORDONNEES GPS
  // ====================================================
  const latitude = Number(
    suivi?.position?.latitude
  );

  const longitude = Number(
    suivi?.position?.longitude
  );


  // ====================================================
  // VERIFICATION DE LA POSITION
  // ====================================================
  const positionDisponible =
    suivi?.position_disponible === true &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);


  // ====================================================
  // POSITION GPS INDISPONIBLE
  // ====================================================
  if (!positionDisponible) {
    return (
      <div className="carte-section">

        <div className="carte-titre">

          <h2>
            Suivi de la livraison
          </h2>

          <p>
            La position GPS du livreur
            n'est pas encore disponible.
          </p>

        </div>


        {suivi?.livraison && (
          <div
            style={{
              marginTop: "20px",
              lineHeight: "1.7",
            }}
          >

            <p>
              <strong>Statut commande :</strong>{" "}
              {suivi?.statut_commande}
            </p>

            <p>
              <strong>Statut livraison :</strong>{" "}
              {suivi?.livraison?.statut}
            </p>

            <p>
              <strong>Distance parcourue :</strong>{" "}
              {Number(
                suivi?.livraison?.distance || 0
              ).toFixed(2)} km
            </p>

          </div>
        )}

      </div>
    );
  }


  // ====================================================
  // POSITION DU LIVREUR
  // ====================================================
  const positionLivreur = [
    latitude,
    longitude
  ];


  // ====================================================
  // AFFICHAGE
  // ====================================================
  return (
    <div className="carte-section">

      <div className="carte-titre">

        <h2>
          Suivi de la livraison
        </h2>

        <p>
          Position actuelle du livreur
        </p>

      </div>


      {/* ============================================== */}
      {/* INFORMATIONS DE LA LIVRAISON */}
      {/* ============================================== */}

      <div
        style={{
          marginBottom: "20px",
          lineHeight: "1.7",
        }}
      >

        <p>
          <strong>Livreur :</strong>{" "}
          {suivi?.livreur?.prenom}{" "}
          {suivi?.livreur?.nom}
        </p>


        <p>
          <strong>Téléphone :</strong>{" "}
          {suivi?.livreur?.telephone ||
            "Non renseigné"}
        </p>


        <p>
          <strong>Départ :</strong>{" "}
          {suivi?.adresse_depart}
        </p>


        <p>
          <strong>Destination :</strong>{" "}
          {suivi?.adresse_arrivee}
        </p>


        <p>
          <strong>Statut commande :</strong>{" "}
          {suivi?.statut_commande}
        </p>


        <p>
          <strong>Statut livraison :</strong>{" "}
          {suivi?.livraison?.statut}
        </p>


        <p>
          <strong>Distance parcourue :</strong>{" "}
          {Number(
            suivi?.livraison?.distance || 0
          ).toFixed(2)} km
        </p>

      </div>


      {/* ============================================== */}
      {/* CARTE OPENSTREETMAP */}
      {/* ============================================== */}

      <MapContainer
        center={positionLivreur}
        zoom={14}
        style={{
          height: "500px",
          width: "100%",
          borderRadius: "16px",
        }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        {/* ============================================ */}
        {/* RECENTRAGE AUTOMATIQUE */}
        {/* ============================================ */}

        <RecentrerCarte
          position={positionLivreur}
        />


        {/* ============================================ */}
        {/* MARQUEUR DU LIVREUR */}
        {/* ============================================ */}

        <Marker
          position={positionLivreur}
        >

          <Popup>

            <strong>
              {suivi?.livreur?.prenom}{" "}
              {suivi?.livreur?.nom}
            </strong>

            <br />

            Livraison :{" "}
            {suivi?.livraison?.statut}

            <br />

            Distance :{" "}
            {Number(
              suivi?.livraison?.distance || 0
            ).toFixed(2)} km

            <br />

            Latitude :{" "}
            {latitude}

            <br />

            Longitude :{" "}
            {longitude}

          </Popup>

        </Marker>

      </MapContainer>

    </div>
  );
}

export default CarteSuivi;