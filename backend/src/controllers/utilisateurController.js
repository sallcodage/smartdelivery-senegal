const pool = require("../config/database");

// ======================================================
// CONSULTER SON PROPRE PROFIL
// GET /api/utilisateurs/me
// ======================================================
const getMonProfil = async (req, res) => {
  try {
    // L'id vient du token JWT grâce à authMiddleware
    const utilisateurId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        nom,
        prenom,
        email,
        telephone,
        role,
        date_creation
      FROM utilisateurs
      WHERE id = $1
      `,
      [utilisateurId]
    );

    // Vérifier si l'utilisateur existe
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable."
      });
    }

    const utilisateur = result.rows[0];

    return res.status(200).json({
      success: true,
      message: "Profil récupéré avec succès.",
      data: {
        utilisateur
      }
    });

  } catch (error) {
    console.error("Erreur récupération profil :", error);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération du profil."
    });
  }
};


// ======================================================
// CONSULTER TOUS LES UTILISATEURS
// GET /api/utilisateurs
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const getTousLesUtilisateurs = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        nom,
        prenom,
        email,
        telephone,
        role,
        date_creation
      FROM utilisateurs
      ORDER BY date_creation DESC
      `
    );

    return res.status(200).json({
      success: true,
      message: "Liste des utilisateurs récupérée avec succès.",
      data: {
        nombre: result.rows.length,
        utilisateurs: result.rows
      }
    });

  } catch (error) {
    console.error(
      "Erreur récupération utilisateurs :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la récupération des utilisateurs."
    });
  }
};


// ======================================================
// CONSULTER UN UTILISATEUR PAR ID
// GET /api/utilisateurs/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const getUtilisateurParId = async (req, res) => {
  try {
    // Récupérer l'id présent dans l'URL
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        nom,
        prenom,
        email,
        telephone,
        role,
        date_creation
      FROM utilisateurs
      WHERE id = $1
      `,
      [id]
    );

    // Vérifier si l'utilisateur existe
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable."
      });
    }

    const utilisateur = result.rows[0];

    return res.status(200).json({
      success: true,
      message: "Utilisateur récupéré avec succès.",
      data: {
        utilisateur
      }
    });

  } catch (error) {
    console.error(
      "Erreur récupération utilisateur :",
      error
    );

    // PostgreSQL renvoie le code 22P02
    // lorsqu'un UUID est mal écrit
    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la récupération de l'utilisateur."
    });
  }
};
// ======================================================
// MODIFIER SON PROPRE PROFIL
// PUT /api/utilisateurs/me
// ======================================================
const modifierMonProfil = async (req, res) => {
  try {
    const utilisateurId = req.user.id;

    const {
      nom,
      prenom,
      email,
      telephone
    } = req.body;

    // Vérifier qu'au moins un champ est fourni
    if (!nom && !prenom && !email && !telephone) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir au moins un champ à modifier."
      });
    }

    // Vérifier si le nouvel email est déjà utilisé
    if (email) {
      const emailExistant = await pool.query(
        `
        SELECT id
        FROM utilisateurs
        WHERE LOWER(email) = LOWER($1)
          AND id <> $2
        `,
        [
          email.trim(),
          utilisateurId
        ]
      );

      if (emailExistant.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé par un autre utilisateur."
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE utilisateurs
      SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        email = COALESCE($3, email),
        telephone = COALESCE($4, telephone)
      WHERE id = $5
      RETURNING
        id,
        nom,
        prenom,
        email,
        telephone,
        role,
        date_creation
      `,
      [
        nom ? nom.trim() : null,
        prenom ? prenom.trim() : null,
        email ? email.trim().toLowerCase() : null,
        telephone ? telephone.trim() : null,
        utilisateurId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profil modifié avec succès.",
      data: {
        utilisateur: result.rows[0]
      }
    });

  } catch (error) {
    console.error("Erreur modification profil :", error);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la modification du profil."
    });
  }
};
// ======================================================
// MODIFIER UN UTILISATEUR PAR ID
// PUT /api/utilisateurs/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const modifierUtilisateurParId = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nom,
      prenom,
      email,
      telephone
    } = req.body;

    // Vérifier qu'au moins un champ est fourni
    if (!nom && !prenom && !email && !telephone) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir au moins un champ à modifier."
      });
    }

    // Vérifier que l'utilisateur existe
    const utilisateurExistant = await pool.query(
      `
      SELECT id
      FROM utilisateurs
      WHERE id = $1
      `,
      [id]
    );

    if (utilisateurExistant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable."
      });
    }

    // Vérifier que l'email n'appartient pas à un autre utilisateur
    if (email) {
      const emailExistant = await pool.query(
        `
        SELECT id
        FROM utilisateurs
        WHERE LOWER(email) = LOWER($1)
          AND id <> $2
        `,
        [
          email.trim(),
          id
        ]
      );

      if (emailExistant.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé par un autre utilisateur."
        });
      }
    }

    // Modifier l'utilisateur
    const result = await pool.query(
      `
      UPDATE utilisateurs
      SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        email = COALESCE($3, email),
        telephone = COALESCE($4, telephone)
      WHERE id = $5
      RETURNING
        id,
        nom,
        prenom,
        email,
        telephone,
        role,
        date_creation
      `,
      [
        nom ? nom.trim() : null,
        prenom ? prenom.trim() : null,
        email ? email.trim().toLowerCase() : null,
        telephone ? telephone.trim() : null,
        id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Utilisateur modifié avec succès.",
      data: {
        utilisateur: result.rows[0]
      }
    });

  } catch (error) {
    console.error("Erreur modification utilisateur :", error);

    // UUID mal écrit
    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la modification de l'utilisateur."
    });
  }
};
// ======================================================
// SUPPRIMER UN UTILISATEUR PAR ID
// DELETE /api/utilisateurs/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const supprimerUtilisateurParId = async (req, res) => {
  try {
    const { id } = req.params;

    // Empêcher un administrateur de supprimer son propre compte
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas supprimer votre propre compte."
      });
    }

    // Vérifier que l'utilisateur existe
    const utilisateurExistant = await pool.query(
      `
      SELECT id, nom, prenom, email, role
      FROM utilisateurs
      WHERE id = $1
      `,
      [id]
    );

    if (utilisateurExistant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable."
      });
    }

    // Supprimer l'utilisateur
    // Les tables liées configurées avec ON DELETE CASCADE
    // seront automatiquement nettoyées
    await pool.query(
      `
      DELETE FROM utilisateurs
      WHERE id = $1
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès.",
      data: {
        utilisateur: utilisateurExistant.rows[0]
      }
    });

  } catch (error) {
    console.error("Erreur suppression utilisateur :", error);

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide."
      });
    }

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "Cet utilisateur ne peut pas être supprimé car certaines données lui sont encore associées."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la suppression de l'utilisateur."
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  getMonProfil,
  getTousLesUtilisateurs,
  getUtilisateurParId,
  modifierMonProfil,
  modifierUtilisateurParId,
  supprimerUtilisateurParId
};