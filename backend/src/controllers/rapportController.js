const pool = require("../config/database");

const {
  genererRapportPDF
} = require("../services/rapportService");


// ======================================================
// GENERER UN RAPPORT
// POST /api/rapports
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const genererRapport = async (req, res) => {
  let client;

  try {
    const adminId = req.user.id;

    const {
      type,
      periode_debut,
      periode_fin
    } = req.body;


    // ==================================================
    // 1. VERIFIER LES CHAMPS OBLIGATOIRES
    // ==================================================
    if (!type || !periode_debut || !periode_fin) {
      return res.status(400).json({
        success: false,
        message:
          "Le type, la période de début et la période de fin sont obligatoires."
      });
    }


    // ==================================================
    // 2. VERIFIER LE TYPE DE RAPPORT
    // ==================================================
    const typesAutorises = [
      "JOURNALIER",
      "HEBDOMADAIRE",
      "MENSUEL",
      "ANNUEL",
      "PERSONNALISE"
    ];

    const typeNormalise =
      String(type).trim().toUpperCase();

    if (!typesAutorises.includes(typeNormalise)) {
      return res.status(400).json({
        success: false,
        message:
          "Type de rapport invalide. Types autorisés : JOURNALIER, HEBDOMADAIRE, MENSUEL, ANNUEL, PERSONNALISE."
      });
    }


    // ==================================================
    // 3. VERIFIER LES DATES
    // ==================================================
    const dateDebut = new Date(periode_debut);
    const dateFin = new Date(periode_fin);

    if (
      Number.isNaN(dateDebut.getTime()) ||
      Number.isNaN(dateFin.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La période indiquée contient une date invalide."
      });
    }

    if (dateDebut > dateFin) {
      return res.status(400).json({
        success: false,
        message:
          "La période de début ne peut pas être postérieure à la période de fin."
      });
    }


    // ==================================================
    // 4. CALCULER LES DONNEES DU RAPPORT
    // ==================================================
    const statistiquesResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_commandes,

        COUNT(*) FILTER (
          WHERE statut = 'CONFIRMEE'
        )::int AS commandes_confirmees,

        COUNT(*) FILTER (
          WHERE statut = 'ANNULEE'
        )::int AS commandes_annulees,

        COALESCE(
          SUM(montant) FILTER (
            WHERE statut = 'CONFIRMEE'
          ),
          0
        ) AS chiffre_affaires

      FROM commandes

      WHERE date_creation >= $1
        AND date_creation < ($2::date + INTERVAL '1 day')
      `,
      [
        periode_debut,
        periode_fin
      ]
    );


    // ==================================================
    // 5. PREPARER LES STATISTIQUES
    // ==================================================
    const statistiques =
      statistiquesResult.rows[0];

    const totalCommandes =
      Number(statistiques.total_commandes || 0);

    const commandesConfirmees =
      Number(
        statistiques.commandes_confirmees || 0
      );

    const commandesAnnulees =
      Number(
        statistiques.commandes_annulees || 0
      );

    const chiffreAffaires =
      Number(
        statistiques.chiffre_affaires || 0
      );

    const tauxReussite =
      totalCommandes > 0
        ? Number(
            (
              commandesConfirmees /
              totalCommandes *
              100
            ).toFixed(2)
          )
        : 0;


    const dataStatistiques = {
      total_commandes: totalCommandes,
      commandes_confirmees:
        commandesConfirmees,
      commandes_annulees:
        commandesAnnulees,
      chiffre_affaires:
        chiffreAffaires,
      taux_reussite:
        tauxReussite
    };


    // ==================================================
    // 6. OUVRIR UNE TRANSACTION
    // ==================================================
    client = await pool.connect();

    await client.query("BEGIN");


    // ==================================================
    // 7. CREER LE RAPPORT EN BASE
    // ==================================================
    const rapportResult = await client.query(
      `
      INSERT INTO rapports (
        admin_id,
        type,
        periode_debut,
        periode_fin,
        fichier_url
      )
      VALUES ($1, $2, $3, $4, NULL)

      RETURNING
        id,
        admin_id,
        type,
        periode_debut,
        periode_fin,
        fichier_url,
        date_generation
      `,
      [
        adminId,
        typeNormalise,
        periode_debut,
        periode_fin
      ]
    );


    const rapport =
      rapportResult.rows[0];


    // ==================================================
    // 8. GENERER LE FICHIER PDF
    // ==================================================
    const pdf = await genererRapportPDF(
      rapport,
      dataStatistiques
    );


    // ==================================================
    // 9. ENREGISTRER L'URL DU PDF
    // ==================================================
    const rapportMisAJourResult =
      await client.query(
        `
        UPDATE rapports

        SET fichier_url = $1

        WHERE id = $2

        RETURNING
          id,
          admin_id,
          type,
          periode_debut,
          periode_fin,
          fichier_url,
          date_generation
        `,
        [
          pdf.fichierUrl,
          rapport.id
        ]
      );


    // ==================================================
    // 10. VALIDER LA TRANSACTION
    // ==================================================
    await client.query("COMMIT");


    // ==================================================
    // 11. REPONSE
    // ==================================================
    return res.status(201).json({
      success: true,

      message:
        "Rapport PDF généré avec succès.",

      data: {
        rapport:
          rapportMisAJourResult.rows[0],

        statistiques:
          dataStatistiques,

        fichier: {
          nom:
            pdf.nomFichier,

          url:
            pdf.fichierUrl
        }
      }
    });

  } catch (error) {

    // ==================================================
    // ANNULER LA TRANSACTION EN CAS D'ERREUR
    // ==================================================
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Erreur rollback rapport :",
          rollbackError
        );
      }
    }


    console.error(
      "Erreur génération rapport :",
      error
    );


    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message:
          "Une valeur fournie est invalide."
      });
    }


    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la génération du rapport."
    });

  } finally {

    // ==================================================
    // LIBERER LA CONNEXION POSTGRESQL
    // ==================================================
    if (client) {
      client.release();
    }

  }
};


// ======================================================
// LISTER TOUS LES RAPPORTS
// GET /api/rapports
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const getTousLesRapports = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        r.id,
        r.admin_id,
        r.type,
        r.periode_debut,
        r.periode_fin,
        r.fichier_url,
        r.date_generation,
        u.nom AS admin_nom,
        u.prenom AS admin_prenom,
        u.email AS admin_email

      FROM rapports r

      INNER JOIN administrateurs a
        ON a.id = r.admin_id

      INNER JOIN utilisateurs u
        ON u.id = a.id

      ORDER BY r.date_generation DESC
    `);


    return res.status(200).json({
      success: true,

      message:
        "Rapports récupérés avec succès.",

      data: {
        nombre_rapports:
          result.rows.length,

        rapports:
          result.rows
      }
    });

  } catch (error) {

    console.error(
      "Erreur récupération rapports :",
      error
    );


    return res.status(500).json({
      success: false,

      message:
        "Une erreur est survenue lors de la récupération des rapports."
    });

  }
};


// ======================================================
// CONSULTER UN RAPPORT PAR SON ID
// GET /api/rapports/:id
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const getRapportParId = async (req, res) => {
  try {

    const { id } = req.params;


    const result = await pool.query(
      `
      SELECT
        r.id,
        r.admin_id,
        r.type,
        r.periode_debut,
        r.periode_fin,
        r.fichier_url,
        r.date_generation,

        u.nom AS admin_nom,
        u.prenom AS admin_prenom,
        u.email AS admin_email

      FROM rapports r

      INNER JOIN administrateurs a
        ON a.id = r.admin_id

      INNER JOIN utilisateurs u
        ON u.id = a.id

      WHERE r.id = $1
      `,
      [id]
    );


    // ==================================================
    // RAPPORT INTROUVABLE
    // ==================================================
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Rapport introuvable."
      });
    }


    // ==================================================
    // REPONSE
    // ==================================================
    return res.status(200).json({
      success: true,

      message:
        "Rapport récupéré avec succès.",

      data: {
        rapport:
          result.rows[0]
      }
    });

  } catch (error) {

    console.error(
      "Erreur récupération rapport :",
      error
    );


    // ==================================================
    // UUID INVALIDE
    // ==================================================
    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,

        message:
          "L'identifiant du rapport est invalide."
      });
    }


    return res.status(500).json({
      success: false,

      message:
        "Une erreur est survenue lors de la récupération du rapport."
    });

  }
};


// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  genererRapport,
  getTousLesRapports,
  getRapportParId
};