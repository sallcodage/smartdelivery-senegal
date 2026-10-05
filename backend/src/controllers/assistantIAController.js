const pool = require("../config/database");

const {
  genererReponseIA
} = require("../services/assistantIAService");


// ======================================================
// POSER UNE QUESTION A L'ASSISTANT IA
// ======================================================
const poserQuestion = async (req, res) => {
  try {
    // ID du client récupéré depuis le token JWT
    const clientId = req.user.id;

    // Question envoyée par le client
    const { question } = req.body;


    // ==================================================
    // VALIDATION
    // ==================================================
    if (
      !question ||
      typeof question !== "string" ||
      question.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "La question est obligatoire."
      });
    }


    // ==================================================
    // VERIFIER QUE LE CLIENT EXISTE
    // ==================================================
    const clientResult = await pool.query(
      `
      SELECT
        c.id,
        u.nom,
        u.prenom,
        u.email
      FROM clients c
      JOIN utilisateurs u
        ON u.id = c.id
      WHERE c.id = $1
      `,
      [clientId]
    );


    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Client introuvable."
      });
    }


    // ==================================================
    // GENERER LA REPONSE
    // ==================================================
    const reponse = await genererReponseIA(
      question.trim()
    );


    // ==================================================
    // ENREGISTRER LA CONVERSATION
    // ==================================================
    const conversationResult = await pool.query(
      `
      INSERT INTO conversations_ia (
        client_id,
        question,
        reponse
      )
      VALUES ($1, $2, $3)
      RETURNING
        id_conversation,
        client_id,
        question,
        reponse,
        date_envoi
      `,
      [
        clientId,
        question.trim(),
        reponse
      ]
    );


    // ==================================================
    // REPONSE API
    // ==================================================
    return res.status(201).json({
      success: true,
      message: "Réponse générée avec succès.",
      data: {
        conversation:
          conversationResult.rows[0]
      }
    });

  } catch (error) {

    console.error(
      "Erreur Assistant IA :",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue avec l'assistant IA."
    });
  }
};


// ======================================================
// HISTORIQUE DES CONVERSATIONS DU CLIENT
// ======================================================
const obtenirHistorique = async (req, res) => {
  try {
    const clientId = req.user.id;


    const result = await pool.query(
      `
      SELECT
        id_conversation,
        question,
        reponse,
        date_envoi
      FROM conversations_ia
      WHERE client_id = $1
      ORDER BY date_envoi DESC
      `,
      [clientId]
    );


    return res.status(200).json({
      success: true,
      message:
        "Historique récupéré avec succès.",
      data: {
        conversations: result.rows
      }
    });

  } catch (error) {

    console.error(
      "Erreur historique Assistant IA :",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer l'historique."
    });
  }
};


module.exports = {
  poserQuestion,
  obtenirHistorique
};