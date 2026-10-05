import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  apiFetch,
  deconnexion,
  getUtilisateur
} from "../services/api";

import "./ClientDashboard.css";
import "./NouvelleCommande.css";


function NouvelleCommande() {
  const navigate = useNavigate();
  const utilisateur = getUtilisateur();

  const [formulaire, setFormulaire] = useState({
    adresseDepart: "",
    adresseArrivee: "",
    montant: ""
  });

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [chargement, setChargement] = useState(false);


  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormulaire((ancien) => ({
      ...ancien,
      [name]: value
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    setErreur("");
    setSucces("");

    if (
      !formulaire.adresseDepart.trim() ||
      !formulaire.adresseArrivee.trim() ||
      !formulaire.montant
    ) {
      setErreur(
        "Veuillez remplir tous les champs."
      );
      return;
    }

    if (Number(formulaire.montant) <= 0) {
      setErreur(
        "Le montant doit être supérieur à 0."
      );
      return;
    }

    try {
      setChargement(true);

      await apiFetch("/api/commandes", {
        method: "POST",

        body: JSON.stringify({
          adresse_depart:
            formulaire.adresseDepart.trim(),

          adresse_arrivee:
            formulaire.adresseArrivee.trim(),

          montant:
            Number(formulaire.montant)
        })
      });

      setSucces(
        "Votre commande a été créée avec succès."
      );

      setFormulaire({
        adresseDepart: "",
        adresseArrivee: "",
        montant: ""
      });

      setTimeout(() => {
        navigate("/mes-commandes");
      }, 1200);

    } catch (error) {
      setErreur(error.message);
    } finally {
      setChargement(false);
    }
  };


  const handleDeconnexion = () => {
    deconnexion();
    navigate("/");
  };


  return (
    <div className="dashboard">

      {/* ============================= */}
      {/* SIDEBAR */}
      {/* ============================= */}

      <aside className="sidebar">

        <div className="sidebar-logo">
          <div className="logo-icon">
            SD
          </div>

          <div>
            <h2>SmartDelivery</h2>
            <span>Sénégal</span>
          </div>
        </div>


        <nav className="sidebar-menu">

          <Link
            className="menu-item"
            to="/client"
          >
            Tableau de bord
          </Link>

          <Link
            className="menu-item active"
            to="/nouvelle-commande"
          >
            Nouvelle commande
          </Link>

          <Link
            className="menu-item"
            to="/mes-commandes"
          >
            Mes commandes
          </Link>

          <Link
            className="menu-item"
            to="/notifications"
          >
            Notifications
          </Link>

          <Link
            className="menu-item"
            to="/assistant"
          >
            Assistant IA
          </Link>

          <Link
            className="menu-item"
            to="/profil"
          >
            Mon profil
          </Link>

        </nav>


        <button
          className="logout-button"
          onClick={handleDeconnexion}
        >
          Déconnexion
        </button>

      </aside>


      {/* ============================= */}
      {/* CONTENU */}
      {/* ============================= */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>
            <p className="welcome-text">
              SmartDelivery Sénégal
            </p>

            <h1>
              Nouvelle commande
            </h1>
          </div>


          <div className="user-profile">

            <div className="user-avatar">
              {utilisateur?.prenom
                ?.charAt(0)
                .toUpperCase() || "C"}
            </div>

            <div>
              <strong>
                {utilisateur?.prenom}{" "}
                {utilisateur?.nom}
              </strong>

              <span>Client</span>
            </div>

          </div>

        </header>


        <section className="order-page-title">

          <Link
            to="/client"
            className="back-link"
          >
            ← Retour au tableau de bord
          </Link>

          <h2>
            Créer une nouvelle livraison
          </h2>

          <p>
            Indiquez les informations nécessaires
            pour enregistrer votre commande.
          </p>

        </section>


        <section className="order-form-container">

          <div className="order-form-card">

            <div className="form-card-header">

              <div className="form-step">
                01
              </div>

              <div>
                <h3>
                  Informations de livraison
                </h3>

                <p>
                  Renseignez le point de départ,
                  la destination et le montant.
                </p>
              </div>

            </div>


            {erreur && (
              <div className="form-message error-message">
                {erreur}
              </div>
            )}


            {succes && (
              <div className="form-message success-message">
                {succes}
              </div>
            )}


            <form
              className="order-form"
              onSubmit={handleSubmit}
            >

              <div className="order-field">

                <label htmlFor="adresseDepart">
                  Adresse de départ
                </label>

                <input
                  id="adresseDepart"
                  name="adresseDepart"
                  type="text"
                  placeholder="Ex : Dakar Plateau"
                  value={formulaire.adresseDepart}
                  onChange={handleChange}
                  required
                />

                <span>
                  Lieu de récupération du colis
                </span>

              </div>


              <div className="route-separator">
                <div></div>
              </div>


              <div className="order-field">

                <label htmlFor="adresseArrivee">
                  Adresse d'arrivée
                </label>

                <input
                  id="adresseArrivee"
                  name="adresseArrivee"
                  type="text"
                  placeholder="Ex : Pikine"
                  value={formulaire.adresseArrivee}
                  onChange={handleChange}
                  required
                />

                <span>
                  Destination finale de la livraison
                </span>

              </div>


              <div className="order-field">

                <label htmlFor="montant">
                  Montant de la livraison (FCFA)
                </label>

                <input
                  id="montant"
                  name="montant"
                  type="number"
                  min="1"
                  placeholder="Ex : 5000"
                  value={formulaire.montant}
                  onChange={handleChange}
                  required
                />

              </div>


              <div className="order-form-actions">

                <Link
                  to="/client"
                  className="cancel-order-button"
                >
                  Annuler
                </Link>

                <button
                  type="submit"
                  className="submit-order-button"
                  disabled={chargement}
                >
                  {chargement
                    ? "Création en cours..."
                    : "Créer la commande"}
                </button>

              </div>

            </form>

          </div>


          <aside className="order-info-card">

            <span className="info-label">
              SMARTDELIVERY
            </span>

            <h3>
              Comment ça fonctionne ?
            </h3>

            <div className="info-step">
              <strong>1</strong>

              <div>
                <h4>Créez la commande</h4>
                <p>
                  Renseignez le départ et la
                  destination.
                </p>
              </div>
            </div>


            <div className="info-step">
              <strong>2</strong>

              <div>
                <h4>Affectation</h4>
                <p>
                  Un livreur pourra être affecté
                  à votre livraison.
                </p>
              </div>
            </div>


            <div className="info-step">
              <strong>3</strong>

              <div>
                <h4>Suivi</h4>
                <p>
                  Suivez ensuite la progression
                  de votre livraison.
                </p>
              </div>
            </div>

          </aside>

        </section>

      </main>

    </div>
  );
}

export default NouvelleCommande;