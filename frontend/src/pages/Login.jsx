import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { connexion } from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErreur("");
    setChargement(true);

    try {
      const resultat = await connexion(
        email,
        motDePasse
      );

      const utilisateur =
        resultat.data.utilisateur;

      // ==========================================
      // REDIRECTION SELON LE ROLE
      // ==========================================

      if (
        utilisateur.role ===
        "ADMINISTRATEUR"
      ) {
        navigate("/admin");
      } else if (
        utilisateur.role ===
        "LIVREUR"
      ) {
        navigate("/livreur");
      } else if (
        utilisateur.role ===
        "CLIENT"
      ) {
        navigate("/client");
      } else {
        setErreur(
          "Rôle utilisateur non reconnu."
        );
      }
    } catch (error) {
      setErreur(error.message);
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        <div className="login-brand">

          <div className="login-logo">
            SD
          </div>

          <h1>
            SmartDelivery Sénégal
          </h1>

          <p>
            Gérez et suivez vos livraisons
            simplement et intelligemment.
          </p>

        </div>


        <div className="login-card">

          <h2>Connexion</h2>

          <p className="login-subtitle">
            Connectez-vous à votre espace
            SmartDelivery
          </p>


          {erreur && (
            <div className="login-error">
              {erreur}
            </div>
          )}


          <form onSubmit={handleSubmit}>

            <div className="form-group">

              <label htmlFor="email">
                Adresse email
              </label>

              <input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

            </div>


            <div className="form-group">

              <label htmlFor="password">
                Mot de passe
              </label>

              <input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={motDePasse}
                onChange={(e) =>
                  setMotDePasse(e.target.value)
                }
                required
              />

            </div>


            <button
              type="submit"
              className="login-button"
              disabled={chargement}
            >
              {chargement
                ? "Connexion..."
                : "Se connecter"}
            </button>

          </form>


          <div className="login-footer">
            <p>
              SmartDelivery Sénégal
            </p>

            <span>
              Plateforme intelligente de
              gestion des livraisons
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;