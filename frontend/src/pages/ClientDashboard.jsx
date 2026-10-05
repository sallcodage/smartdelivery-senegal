import { Link, useNavigate } from "react-router-dom";
import { deconnexion, getUtilisateur } from "../services/api";

function ClientDashboard() {
  const navigate = useNavigate();
  const utilisateur = getUtilisateur();

  const handleDeconnexion = () => {
    deconnexion();
    navigate("/");
  };

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <div className="logo-icon">SD</div>

          <div>
            <h2>SmartDelivery</h2>
            <span>Sénégal</span>
          </div>
        </div>

        <nav className="sidebar-menu">

          <Link className="menu-item active" to="/client">
            Tableau de bord
          </Link>

          <Link className="menu-item" to="/nouvelle-commande">
            Nouvelle commande
          </Link>

          <Link className="menu-item" to="/mes-commandes">
            Mes commandes
          </Link>

          <Link className="menu-item" to="/notifications">
            Notifications
          </Link>

          <Link className="menu-item" to="/assistant">
            Assistant IA
          </Link>

          <Link className="menu-item" to="/profil">
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


      {/* CONTENU PRINCIPAL */}
      <main className="dashboard-main">

        {/* HEADER */}
        <header className="dashboard-header">

          <div>
            <p className="welcome-text">
              Bienvenue
            </p>

            <h1>
              {utilisateur?.prenom || "Client"}{" "}
              {utilisateur?.nom || ""}
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


        {/* TITRE */}
        <section className="dashboard-title">

          <div>
            <h2>Tableau de bord</h2>

            <p>
              Suivez et gérez vos livraisons
              depuis votre espace personnel.
            </p>
          </div>

          <Link
            to="/nouvelle-commande"
            className="new-order-button"
          >
            + Nouvelle commande
          </Link>

        </section>


        {/* STATISTIQUES */}
        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon">01</div>

            <div>
              <span>Total commandes</span>
              <h3>--</h3>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon">02</div>

            <div>
              <span>En cours</span>
              <h3>--</h3>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon">03</div>

            <div>
              <span>Livrées</span>
              <h3>--</h3>
            </div>
          </div>


          <div className="stat-card">
            <div className="stat-icon">04</div>

            <div>
              <span>Notifications</span>
              <h3>--</h3>
            </div>
          </div>

        </section>


        {/* ACTIONS */}
        <section className="dashboard-section">

          <div className="section-header">
            <div>
              <h2>Actions rapides</h2>

              <p>
                Accédez rapidement aux principales
                fonctionnalités.
              </p>
            </div>
          </div>


          <div className="actions-grid">

            <Link
              to="/nouvelle-commande"
              className="action-card"
            >
              <div className="action-number">01</div>

              <h3>Nouvelle commande</h3>

              <p>
                Créez une nouvelle demande
                de livraison.
              </p>

              <span>Créer une commande →</span>
            </Link>


            <Link
              to="/mes-commandes"
              className="action-card"
            >
              <div className="action-number">02</div>

              <h3>Mes commandes</h3>

              <p>
                Consultez vos commandes et
                leur statut.
              </p>

              <span>Voir mes commandes →</span>
            </Link>


            <Link
              to="/assistant"
              className="action-card"
            >
              <div className="action-number">03</div>

              <h3>Assistant IA</h3>

              <p>
                Posez vos questions concernant
                vos livraisons.
              </p>

              <span>Discuter avec l'assistant →</span>
            </Link>

          </div>

        </section>

      </main>

    </div>
  );
}

export default ClientDashboard;