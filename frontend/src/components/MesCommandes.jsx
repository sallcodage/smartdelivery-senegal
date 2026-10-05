import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  apiFetch,
  getUtilisateur,
  deconnexion,
} from "../services/api";


function MesCommandes() {
  const navigate = useNavigate();

  const utilisateur = getUtilisateur();

  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [
    commandeEnAnnulation,
    setCommandeEnAnnulation,
  ] = useState(null);

  const [
    commandeEnConfirmation,
    setCommandeEnConfirmation,
  ] = useState(null);


  // ====================================================
  // RECUPERER LES COMMANDES DU CLIENT
  // ====================================================

  useEffect(() => {
    const recupererCommandes = async () => {
      try {
        setChargement(true);
        setErreur("");

        const resultat = await apiFetch(
          "/api/commandes/mes-commandes",
          {
            method: "GET",
          }
        );

        setCommandes(
          resultat.data?.commandes || []
        );

      } catch (error) {
        console.error(
          "Erreur récupération commandes :",
          error
        );

        setErreur(
          error.message ||
            "Impossible de récupérer vos commandes."
        );

      } finally {
        setChargement(false);
      }
    };

    recupererCommandes();

  }, []);


  // ====================================================
  // SUIVRE UNE LIVRAISON
  // ====================================================

  const suivreLivraison = (commandeId) => {
    navigate(`/suivi/${commandeId}`);
  };


  // ====================================================
  // ANNULER UNE COMMANDE
  // ====================================================

  const annulerCommande = async (commandeId) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment annuler cette commande ?"
    );

    if (!confirmation) {
      return;
    }

    try {
      setErreur("");
      setCommandeEnAnnulation(commandeId);

      const resultat = await apiFetch(
        `/api/commandes/${commandeId}/annuler`,
        {
          method: "PATCH",
        }
      );

      setCommandes((anciennesCommandes) =>
        anciennesCommandes.map((commande) =>
          commande.id === commandeId
            ? {
                ...commande,
                statut:
                  resultat.data?.commande?.statut ||
                  "ANNULEE",
              }
            : commande
        )
      );

      window.alert(
        resultat.message ||
          "Commande annulée avec succès."
      );

    } catch (error) {
      console.error(
        "Erreur annulation commande :",
        error
      );

      window.alert(
        error.message ||
          "Impossible d'annuler cette commande."
      );

    } finally {
      setCommandeEnAnnulation(null);
    }
  };


  // ====================================================
  // CONFIRMER LA RECEPTION
  // ====================================================

  const confirmerReception = async (commandeId) => {
    const confirmation = window.confirm(
      "Confirmez-vous avoir bien reçu votre livraison ?"
    );

    if (!confirmation) {
      return;
    }

    try {
      setErreur("");
      setCommandeEnConfirmation(commandeId);

      const resultat = await apiFetch(
        `/api/commandes/${commandeId}/confirmer`,
        {
          method: "PATCH",
        }
      );

      setCommandes((anciennesCommandes) =>
        anciennesCommandes.map((commande) =>
          commande.id === commandeId
            ? {
                ...commande,
                statut:
                  resultat.data?.commande?.statut ||
                  "CONFIRMEE",
              }
            : commande
        )
      );

      window.alert(
        resultat.message ||
          "Réception confirmée avec succès."
      );

    } catch (error) {
      console.error(
        "Erreur confirmation réception :",
        error
      );

      window.alert(
        error.message ||
          "Impossible de confirmer la réception."
      );

    } finally {
      setCommandeEnConfirmation(null);
    }
  };


  // ====================================================
  // NOUVELLE COMMANDE
  // ====================================================

  const nouvelleCommande = () => {
    navigate("/nouvelle-commande");
  };


  // ====================================================
  // RETOUR DASHBOARD
  // ====================================================

  const retourDashboard = () => {
    navigate("/client");
  };


  // ====================================================
  // DECONNEXION
  // ====================================================

  const seDeconnecter = () => {
    deconnexion();
    navigate("/");
  };


  // ====================================================
  // FORMATAGE DU STATUT
  // ====================================================

  const formaterStatut = (statut) => {
    const statuts = {
      NOUVELLE: "Nouvelle",
      VALIDEE: "Validée",
      LIVREUR_AFFECTE: "Livreur affecté",
      ACCEPTEE: "Acceptée",
      EN_COURS: "En cours",
      LIVREE: "Livrée",
      CONFIRMEE: "Confirmée",
      ANNULEE: "Annulée",
    };

    return statuts[statut] || statut;
  };


  // ====================================================
  // COULEURS DU STATUT
  // ====================================================

  const getStyleStatut = (statut) => {
    switch (statut) {

      case "NOUVELLE":
        return {
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
        };

      case "VALIDEE":
        return {
          backgroundColor: "#ede9fe",
          color: "#6d28d9",
        };

      case "LIVREUR_AFFECTE":
        return {
          backgroundColor: "#fef3c7",
          color: "#92400e",
        };

      case "ACCEPTEE":
        return {
          backgroundColor: "#cffafe",
          color: "#155e75",
        };

      case "EN_COURS":
        return {
          backgroundColor: "#ffedd5",
          color: "#c2410c",
        };

      case "LIVREE":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
        };

      case "CONFIRMEE":
        return {
          backgroundColor: "#bbf7d0",
          color: "#14532d",
        };

      case "ANNULEE":
        return {
          backgroundColor: "#fee2e2",
          color: "#b91c1c",
        };

      default:
        return {
          backgroundColor: "#f3f4f6",
          color: "#374151",
        };
    }
  };


  // ====================================================
  // FORMATAGE DATE
  // ====================================================

  const formaterDate = (date) => {
    if (!date) {
      return "Non disponible";
    }

    return new Date(date).toLocaleString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


  // ====================================================
  // INTERFACE
  // ====================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f4f7f6",
        display: "flex",
      }}
    >

      {/* ============================================= */}
      {/* SIDEBAR */}
      {/* ============================================= */}

      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          backgroundColor: "#111827",
          color: "white",
          padding: "30px 20px",
          boxSizing: "border-box",
        }}
      >

        <h2
          style={{
            marginTop: 0,
            marginBottom: "8px",
          }}
        >
          SmartDelivery
        </h2>

        <p
          style={{
            color: "#9ca3af",
            marginTop: 0,
            marginBottom: "35px",
          }}
        >
          Espace Client
        </p>


        <button
          type="button"
          onClick={retourDashboard}
          style={styleBoutonMenu}
        >
          Tableau de bord
        </button>


        <button
          type="button"
          onClick={nouvelleCommande}
          style={styleBoutonMenu}
        >
          Nouvelle commande
        </button>


        <button
          type="button"
          onClick={() =>
            navigate("/mes-commandes")
          }
          style={{
            ...styleBoutonMenu,
            backgroundColor: "#16a34a",
            color: "white",
          }}
        >
          Mes commandes
        </button>


        <button
          type="button"
          onClick={() =>
            navigate("/notifications")
          }
          style={styleBoutonMenu}
        >
          Notifications
        </button>


        <button
          type="button"
          onClick={() =>
            navigate("/assistant")
          }
          style={styleBoutonMenu}
        >
          Assistant IA
        </button>


        <button
          type="button"
          onClick={() =>
            navigate("/profil")
          }
          style={styleBoutonMenu}
        >
          Mon profil
        </button>


        <button
          type="button"
          onClick={seDeconnecter}
          style={{
            ...styleBoutonMenu,
            marginTop: "40px",
            color: "#fca5a5",
          }}
        >
          Déconnexion
        </button>

      </aside>


      {/* ============================================= */}
      {/* CONTENU PRINCIPAL */}
      {/* ============================================= */}

      <main
        style={{
          flex: 1,
          padding: "40px",
          boxSizing: "border-box",
        }}
      >

        {/* =========================================== */}
        {/* ENTETE */}
        {/* =========================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "35px",
            gap: "20px",
          }}
        >

          <div>

            <h1
              style={{
                margin: 0,
                color: "#111827",
              }}
            >
              Mes commandes
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#6b7280",
              }}
            >
              Retrouvez et suivez toutes vos commandes.
            </p>

          </div>


          <button
            type="button"
            onClick={nouvelleCommande}
            style={{
              border: "none",
              backgroundColor: "#16a34a",
              color: "white",
              padding: "13px 20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            + Nouvelle commande
          </button>

        </div>


        {/* =========================================== */}
        {/* UTILISATEUR */}
        {/* =========================================== */}

        {utilisateur && (
          <div
            style={{
              backgroundColor: "white",
              padding: "18px 22px",
              borderRadius: "14px",
              marginBottom: "25px",
              boxShadow:
                "0 4px 15px rgba(0,0,0,0.05)",
            }}
          >
            <strong>
              {utilisateur.prenom}{" "}
              {utilisateur.nom}
            </strong>

            <span
              style={{
                marginLeft: "10px",
                color: "#6b7280",
              }}
            >
              {utilisateur.email}
            </span>
          </div>
        )}


        {/* =========================================== */}
        {/* CHARGEMENT */}
        {/* =========================================== */}

        {chargement && (
          <div style={styleMessage}>
            Chargement de vos commandes...
          </div>
        )}


        {/* =========================================== */}
        {/* ERREUR */}
        {/* =========================================== */}

        {!chargement && erreur && (
          <div
            style={{
              ...styleMessage,
              color: "#b91c1c",
              backgroundColor: "#fee2e2",
            }}
          >
            {erreur}
          </div>
        )}


        {/* =========================================== */}
        {/* AUCUNE COMMANDE */}
        {/* =========================================== */}

        {!chargement &&
          !erreur &&
          commandes.length === 0 && (

            <div style={styleMessage}>

              <h3>
                Aucune commande
              </h3>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                Vous n'avez aucune commande
                pour le moment.
              </p>

              <button
                type="button"
                onClick={nouvelleCommande}
                style={{
                  border: "none",
                  backgroundColor: "#16a34a",
                  color: "white",
                  padding: "12px 18px",
                  borderRadius: "9px",
                  cursor: "pointer",
                }}
              >
                Créer ma première commande
              </button>

            </div>

          )}


        {/* =========================================== */}
        {/* LISTE DES COMMANDES */}
        {/* =========================================== */}

        {!chargement &&
          !erreur &&
          commandes.length > 0 && (

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "20px",
              }}
            >

              {commandes.map((commande) => {

                const styleStatut =
                  getStyleStatut(
                    commande.statut
                  );


                const peutAnnuler =
                  [
                    "NOUVELLE",
                    "VALIDEE",
                  ].includes(
                    commande.statut
                  );


                const peutConfirmer =
                  commande.statut === "LIVREE";


                const peutSuivre =
                  [
                    "LIVREUR_AFFECTE",
                    "ACCEPTEE",
                    "EN_COURS",
                    "LIVREE",
                    "CONFIRMEE",
                  ].includes(
                    commande.statut
                  );


                return (
                  <div
                    key={commande.id}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "16px",
                      padding: "24px",
                      boxShadow:
                        "0 4px 18px rgba(0,0,0,0.06)",
                      border:
                        "1px solid #e5e7eb",
                    }}
                  >

                    {/* ============================= */}
                    {/* STATUT */}
                    {/* ============================= */}

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                        gap: "10px",
                      }}
                    >

                      <strong
                        style={{
                          color: "#111827",
                        }}
                      >
                        Commande
                      </strong>


                      <span
                        style={{
                          ...styleStatut,
                          padding: "6px 10px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: "600",
                        }}
                      >
                        {formaterStatut(
                          commande.statut
                        )}
                      </span>

                    </div>


                    {/* ============================= */}
                    {/* DEPART */}
                    {/* ============================= */}

                    <p>
                      <strong>
                        Départ :
                      </strong>{" "}
                      {commande.adresse_depart}
                    </p>


                    {/* ============================= */}
                    {/* DESTINATION */}
                    {/* ============================= */}

                    <p>
                      <strong>
                        Destination :
                      </strong>{" "}
                      {commande.adresse_arrivee}
                    </p>


                    {/* ============================= */}
                    {/* MONTANT */}
                    {/* ============================= */}

                    <p>
                      <strong>
                        Montant :
                      </strong>{" "}
                      {Number(
                        commande.montant || 0
                      ).toLocaleString(
                        "fr-FR"
                      )}{" "}
                      FCFA
                    </p>


                    {/* ============================= */}
                    {/* DATE */}
                    {/* ============================= */}

                    <p>
                      <strong>
                        Créée le :
                      </strong>{" "}
                      {formaterDate(
                        commande.date_creation
                      )}
                    </p>


                    {/* ============================= */}
                    {/* REFERENCE */}
                    {/* ============================= */}

                    <p
                      style={{
                        color: "#9ca3af",
                        fontSize: "12px",
                        wordBreak: "break-all",
                      }}
                    >
                      Référence : {commande.id}
                    </p>


                    {/* ============================= */}
                    {/* ANNULER */}
                    {/* ============================= */}

                    {peutAnnuler && (

                      <button
                        type="button"
                        disabled={
                          commandeEnAnnulation ===
                          commande.id
                        }
                        onClick={() =>
                          annulerCommande(
                            commande.id
                          )
                        }
                        style={{
                          width: "100%",
                          marginTop: "12px",
                          border:
                            "1px solid #dc2626",
                          backgroundColor:
                            commandeEnAnnulation ===
                            commande.id
                              ? "#f3f4f6"
                              : "white",
                          color: "#dc2626",
                          padding: "12px",
                          borderRadius: "9px",
                          cursor:
                            commandeEnAnnulation ===
                            commande.id
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: "600",
                        }}
                      >
                        {commandeEnAnnulation ===
                        commande.id
                          ? "Annulation..."
                          : "Annuler la commande"}
                      </button>

                    )}


                    {/* ============================= */}
                    {/* CONFIRMER LA RECEPTION */}
                    {/* ============================= */}

                    {peutConfirmer && (

                      <button
                        type="button"
                        disabled={
                          commandeEnConfirmation ===
                          commande.id
                        }
                        onClick={() =>
                          confirmerReception(
                            commande.id
                          )
                        }
                        style={{
                          width: "100%",
                          marginTop: "12px",
                          border: "none",
                          backgroundColor:
                            commandeEnConfirmation ===
                            commande.id
                              ? "#86efac"
                              : "#16a34a",
                          color: "white",
                          padding: "12px",
                          borderRadius: "9px",
                          cursor:
                            commandeEnConfirmation ===
                            commande.id
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: "600",
                        }}
                      >
                        {commandeEnConfirmation ===
                        commande.id
                          ? "Confirmation..."
                          : "Confirmer la réception"}
                      </button>

                    )}


                    {/* ============================= */}
                    {/* SUIVRE */}
                    {/* ============================= */}

                    {peutSuivre && (

                      <button
                        type="button"
                        onClick={() =>
                          suivreLivraison(
                            commande.id
                          )
                        }
                        style={{
                          width: "100%",
                          marginTop: "12px",
                          border: "none",
                          backgroundColor:
                            "#111827",
                          color: "white",
                          padding: "12px",
                          borderRadius: "9px",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Suivre la livraison
                      </button>

                    )}

                  </div>
                );
              })}

            </div>

          )}

      </main>

    </div>
  );
}


// ======================================================
// STYLES
// ======================================================

const styleBoutonMenu = {
  width: "100%",
  display: "block",
  textAlign: "left",
  padding: "12px 14px",
  marginBottom: "8px",
  border: "none",
  borderRadius: "9px",
  backgroundColor: "transparent",
  color: "#d1d5db",
  cursor: "pointer",
  fontSize: "15px",
};


const styleMessage = {
  backgroundColor: "white",
  padding: "30px",
  borderRadius: "16px",
  boxShadow:
    "0 4px 18px rgba(0,0,0,0.05)",
};


export default MesCommandes;