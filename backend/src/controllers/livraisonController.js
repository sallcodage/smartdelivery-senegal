const pool = require("../config/database");


// ======================================================
// CALCULER LA DISTANCE ENTRE DEUX POSITIONS GPS
// FORMULE DE HAVERSINE
// RESULTAT EN KILOMETRES
// ======================================================
const calculerDistanceGPS = (
  latitude1,
  longitude1,
  latitude2,
  longitude2
) => {
  const rayonTerre = 6371;

  const convertirEnRadians = (degre) => {
    return degre * (Math.PI / 180);
  };

  const differenceLatitude =
    convertirEnRadians(latitude2 - latitude1);

  const differenceLongitude =
    convertirEnRadians(longitude2 - longitude1);

  const lat1 = convertirEnRadians(latitude1);
  const lat2 = convertirEnRadians(latitude2);

  const a =
    Math.sin(differenceLatitude / 2) *
      Math.sin(differenceLatitude / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(differenceLongitude / 2) *
      Math.sin(differenceLongitude / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  const distance = rayonTerre * c;

  return distance;
};


// ======================================================
// CONSULTER SES LIVRAISONS
// GET /api/livraisons/mes-livraisons
// LIVREUR UNIQUEMENT
// ======================================================
const getMesLivraisons = async (req, res) => {
  try {
    const livreurId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        l.id,
        l.commande_id,
        l.livreur_id,
        l.statut AS statut_livraison,
        l.date_debut,
        l.date_fin,
        l.distance,
        l.montant,

        c.adresse_depart,
        c.adresse_arrivee,
        c.statut AS statut_commande,
        c.date_creation AS date_creation_commande,

        u.nom AS client_nom,
        u.prenom AS client_prenom,
        u.telephone AS client_telephone,
        u.email AS client_email

      FROM livraisons l

      INNER JOIN commandes c
        ON c.id = l.commande_id

      INNER JOIN clients cl
        ON cl.id = c.client_id

      INNER JOIN utilisateurs u
        ON u.id = cl.id

      WHERE l.livreur_id = $1

      ORDER BY c.date_creation DESC
      `,
      [livreurId]
    );

    return res.status(200).json({
      success: true,
      message:
        "Liste de vos livraisons récupérée avec succès.",
      data: {
        nombre: result.rows.length,
        livraisons: result.rows
      }
    });

  } catch (error) {
    console.error(
      "Erreur récupération livraisons du livreur :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la récupération de vos livraisons."
    });
  }
};


// ======================================================
// ACCEPTER UNE LIVRAISON
// PATCH /api/livraisons/:id/accepter
// LIVREUR UNIQUEMENT
// ======================================================
const accepterLivraison = async (req, res) => {
  let client;

  try {
    const { id } = req.params;
    const livreurId = req.user.id;

    client = await pool.connect();

    await client.query("BEGIN");

    const livraisonResult = await client.query(
      `
      SELECT
        l.id,
        l.commande_id,
        l.livreur_id,
        l.statut,
        l.date_debut,
        l.date_fin,
        l.distance,
        l.montant,

        c.client_id,
        c.statut AS commande_statut

      FROM livraisons l

      INNER JOIN commandes c
        ON c.id = l.commande_id

      WHERE l.id = $1
        AND l.livreur_id = $2

      FOR UPDATE
      `,
      [id, livreurId]
    );

    if (livraisonResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Livraison introuvable ou non affectée à ce livreur."
      });
    }

    const livraison = livraisonResult.rows[0];

    if (livraison.statut !== "AFFECTEE") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "Seule une livraison au statut AFFECTEE peut être acceptée."
      });
    }

    if (
      livraison.commande_statut !==
      "LIVREUR_AFFECTE"
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "La commande associée n'est pas dans un état permettant l'acceptation."
      });
    }

    const livraisonMiseAJour =
      await client.query(
        `
        UPDATE livraisons
        SET statut = 'ACCEPTEE'
        WHERE id = $1
          AND livreur_id = $2
        RETURNING
          id,
          commande_id,
          livreur_id,
          statut,
          date_debut,
          date_fin,
          distance,
          montant
        `,
        [id, livreurId]
      );

    const commandeMiseAJour =
      await client.query(
        `
        UPDATE commandes
        SET statut = 'ACCEPTEE'
        WHERE id = $1
        RETURNING
          id,
          client_id,
          adresse_depart,
          adresse_arrivee,
          montant,
          statut,
          date_creation
        `,
        [livraison.commande_id]
      );

    const notificationResult =
      await client.query(
        `
        INSERT INTO notifications (
          utilisateur_id,
          message,
          statut
        )
        VALUES ($1, $2, 'NON_LUE')
        RETURNING
          id,
          utilisateur_id,
          message,
          statut,
          date_creation
        `,
        [
          livraison.client_id,
          "Votre livreur a accepté la livraison de votre commande."
        ]
      );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Livraison acceptée avec succès.",
      data: {
        livraison:
          livraisonMiseAJour.rows[0],
        commande:
          commandeMiseAJour.rows[0],
        notification:
          notificationResult.rows[0]
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Erreur rollback :",
          rollbackError
        );
      }
    }

    console.error(
      "Erreur acceptation livraison :",
      error
    );

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de livraison invalide."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de l'acceptation de la livraison."
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};


// ======================================================
// DEMARRER UNE LIVRAISON
// PATCH /api/livraisons/:id/demarrer
// LIVREUR UNIQUEMENT
// ======================================================
const demarrerLivraison = async (req, res) => {
  let client;

  try {
    const { id } = req.params;
    const livreurId = req.user.id;

    client = await pool.connect();

    await client.query("BEGIN");

    const livraisonResult =
      await client.query(
        `
        SELECT
          l.id,
          l.commande_id,
          l.livreur_id,
          l.statut,
          l.date_debut,
          l.date_fin,
          l.distance,
          l.montant,

          c.client_id,
          c.statut AS commande_statut

        FROM livraisons l

        INNER JOIN commandes c
          ON c.id = l.commande_id

        WHERE l.id = $1
          AND l.livreur_id = $2

        FOR UPDATE
        `,
        [id, livreurId]
      );

    if (
      livraisonResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Livraison introuvable ou non affectée à ce livreur."
      });
    }

    const livraison =
      livraisonResult.rows[0];

    if (
      livraison.statut !== "ACCEPTEE"
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "Seule une livraison au statut ACCEPTEE peut être démarrée."
      });
    }

    if (
      livraison.commande_statut !==
      "ACCEPTEE"
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "La commande associée n'est pas dans un état permettant le démarrage."
      });
    }

    const livraisonMiseAJour =
      await client.query(
        `
        UPDATE livraisons
        SET
          statut = 'EN_COURS',
          date_debut = NOW()
        WHERE id = $1
          AND livreur_id = $2
        RETURNING
          id,
          commande_id,
          livreur_id,
          statut,
          date_debut,
          date_fin,
          distance,
          montant
        `,
        [id, livreurId]
      );

    const commandeMiseAJour =
      await client.query(
        `
        UPDATE commandes
        SET statut = 'EN_COURS'
        WHERE id = $1
        RETURNING
          id,
          client_id,
          adresse_depart,
          adresse_arrivee,
          montant,
          statut,
          date_creation
        `,
        [livraison.commande_id]
      );

    const notificationResult =
      await client.query(
        `
        INSERT INTO notifications (
          utilisateur_id,
          message,
          statut
        )
        VALUES ($1, $2, 'NON_LUE')
        RETURNING
          id,
          utilisateur_id,
          message,
          statut,
          date_creation
        `,
        [
          livraison.client_id,
          "Votre livraison a démarré. Votre commande est maintenant en cours d'acheminement."
        ]
      );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Livraison démarrée avec succès.",
      data: {
        livraison:
          livraisonMiseAJour.rows[0],
        commande:
          commandeMiseAJour.rows[0],
        notification:
          notificationResult.rows[0]
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Erreur rollback :",
          rollbackError
        );
      }
    }

    console.error(
      "Erreur démarrage livraison :",
      error
    );

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de livraison invalide."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors du démarrage de la livraison."
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};


// ======================================================
// TERMINER UNE LIVRAISON
// PATCH /api/livraisons/:id/terminer
// LIVREUR UNIQUEMENT
// ======================================================
const terminerLivraison = async (req, res) => {
  let client;

  try {
    const { id } = req.params;
    const livreurId = req.user.id;

    client = await pool.connect();

    await client.query("BEGIN");

    const livraisonResult =
      await client.query(
        `
        SELECT
          l.id,
          l.commande_id,
          l.livreur_id,
          l.statut,
          l.date_debut,
          l.date_fin,
          l.distance,
          l.montant,

          c.client_id,
          c.statut AS commande_statut

        FROM livraisons l

        INNER JOIN commandes c
          ON c.id = l.commande_id

        WHERE l.id = $1
          AND l.livreur_id = $2

        FOR UPDATE
        `,
        [id, livreurId]
      );

    if (
      livraisonResult.rows.length === 0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Livraison introuvable ou non affectée à ce livreur."
      });
    }

    const livraison =
      livraisonResult.rows[0];

    if (
      livraison.statut !== "EN_COURS"
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "Seule une livraison au statut EN_COURS peut être terminée."
      });
    }

    if (
      livraison.commande_statut !==
      "EN_COURS"
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "La commande associée n'est pas dans un état permettant la terminaison."
      });
    }

    const livraisonMiseAJour =
      await client.query(
        `
        UPDATE livraisons
        SET
          statut = 'TERMINEE',
          date_fin = NOW()
        WHERE id = $1
          AND livreur_id = $2
        RETURNING
          id,
          commande_id,
          livreur_id,
          statut,
          date_debut,
          date_fin,
          distance,
          montant
        `,
        [id, livreurId]
      );

    const commandeMiseAJour =
      await client.query(
        `
        UPDATE commandes
        SET statut = 'LIVREE'
        WHERE id = $1
        RETURNING
          id,
          client_id,
          adresse_depart,
          adresse_arrivee,
          montant,
          statut,
          date_creation
        `,
        [livraison.commande_id]
      );

    const livreurMisAJour =
      await client.query(
        `
        UPDATE livreurs
        SET disponibilite = true
        WHERE id = $1
        RETURNING
          id,
          vehicule,
          disponibilite,
          note_moyenne
        `,
        [livreurId]
      );

    const notificationResult =
      await client.query(
        `
        INSERT INTO notifications (
          utilisateur_id,
          message,
          statut
        )
        VALUES ($1, $2, 'NON_LUE')
        RETURNING
          id,
          utilisateur_id,
          message,
          statut,
          date_creation
        `,
        [
          livraison.client_id,
          "Votre commande a été livrée. Merci de confirmer sa réception."
        ]
      );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Livraison terminée avec succès.",
      data: {
        livraison:
          livraisonMiseAJour.rows[0],
        commande:
          commandeMiseAJour.rows[0],
        livreur:
          livreurMisAJour.rows[0],
        notification:
          notificationResult.rows[0]
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Erreur rollback :",
          rollbackError
        );
      }
    }

    console.error(
      "Erreur terminaison livraison :",
      error
    );

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de livraison invalide."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la terminaison de la livraison."
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};
const mettreAJourPosition = async (req, res) => {
  let client;

  try {
    const { id } = req.params;
    const livreurId = req.user.id;

    const { latitude, longitude } = req.body;

    // ==================================================
    // 1. VERIFIER LES COORDONNEES
    // ==================================================
    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La latitude et la longitude sont obligatoires."
      });
    }

    const latitudeNombre = Number(latitude);
    const longitudeNombre = Number(longitude);

    // ==================================================
    // 2. VERIFIER QUE CE SONT DES NOMBRES
    // ==================================================
    if (
      !Number.isFinite(latitudeNombre) ||
      !Number.isFinite(longitudeNombre)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La latitude et la longitude doivent être des nombres valides."
      });
    }

    // ==================================================
    // 3. VERIFIER LES LIMITES GPS
    // ==================================================
    if (
      latitudeNombre < -90 ||
      latitudeNombre > 90
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La latitude doit être comprise entre -90 et 90."
      });
    }

    if (
      longitudeNombre < -180 ||
      longitudeNombre > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La longitude doit être comprise entre -180 et 180."
      });
    }

    // ==================================================
    // 4. OUVRIR UNE CONNEXION / TRANSACTION
    // ==================================================
    client = await pool.connect();

    await client.query("BEGIN");

    // ==================================================
    // 5. RECUPERER LA POSITION ACTUELLE
    // ==================================================
    const livraisonResult = await client.query(
      `
      SELECT
        id,
        livreur_id,
        statut,
        latitude_livreur,
        longitude_livreur,
        distance
      FROM livraisons
      WHERE id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (livraisonResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Livraison introuvable."
      });
    }

    const livraison = livraisonResult.rows[0];

    // ==================================================
    // 6. VERIFIER LE LIVREUR
    // ==================================================
    if (livraison.livreur_id !== livreurId) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message:
          "Vous n'êtes pas affecté à cette livraison."
      });
    }

    // ==================================================
    // 7. VERIFIER LE STATUT
    // ==================================================
    if (livraison.statut !== "EN_COURS") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "La position GPS peut être mise à jour uniquement pendant une livraison EN_COURS."
      });
    }

    // ==================================================
    // 8. DISTANCE DU NOUVEAU DEPLACEMENT
    // ==================================================
    let distanceAjoutee = 0;

    if (
      livraison.latitude_livreur !== null &&
      livraison.longitude_livreur !== null
    ) {
      const ancienneLatitude =
        Number(livraison.latitude_livreur);

      const ancienneLongitude =
        Number(livraison.longitude_livreur);

      distanceAjoutee = calculerDistanceGPS(
        ancienneLatitude,
        ancienneLongitude,
        latitudeNombre,
        longitudeNombre
      );
    }

    // ==================================================
    // 9. DISTANCE TOTALE
    // ==================================================
    const distanceActuelle =
      Number(livraison.distance || 0);

    const nouvelleDistance =
      distanceActuelle + distanceAjoutee;

    // ==================================================
    // 10. METTRE A JOUR POSITION + DISTANCE
    // ==================================================
    const positionResult = await client.query(
      `
      UPDATE livraisons
      SET
        latitude_livreur = $1,
        longitude_livreur = $2,
        position_mise_a_jour = CURRENT_TIMESTAMP,
        distance = $3
      WHERE id = $4
      RETURNING
        id,
        commande_id,
        livreur_id,
        statut,
        latitude_livreur,
        longitude_livreur,
        position_mise_a_jour,
        distance
      `,
      [
        latitudeNombre,
        longitudeNombre,
        nouvelleDistance,
        id
      ]
    );

    await client.query("COMMIT");

    // ==================================================
    // 11. REPONSE
    // ==================================================
    return res.status(200).json({
      success: true,
      message:
        "Position GPS et distance mises à jour avec succès.",
      data: {
        ...positionResult.rows[0],

        distance_ajoutee_km:
          Number(distanceAjoutee.toFixed(3)),

        distance_totale_km:
          Number(nouvelleDistance.toFixed(3))
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Erreur rollback :",
          rollbackError
        );
      }
    }

    console.error(
      "Erreur mise à jour position GPS :",
      error
    );

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message:
          "L'identifiant de la livraison est invalide."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la mise à jour de la position GPS."
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};


// ======================================================
// RECUPERER LA POSITION GPS D'UNE LIVRAISON
// GET /api/livraisons/:id/position
// LIVREUR UNIQUEMENT
// ======================================================
const getPositionLivraison = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const livreurId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        commande_id,
        livreur_id,
        statut,
        latitude_livreur,
        longitude_livreur,
        position_mise_a_jour
      FROM livraisons
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Livraison introuvable."
      });
    }

    const livraison =
      result.rows[0];

    if (
      livraison.livreur_id !==
      livreurId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous n'êtes pas autorisé à consulter cette livraison."
      });
    }

    if (
      livraison.latitude_livreur ===
        null ||
      livraison.longitude_livreur ===
        null
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Aucune position GPS n'est encore disponible pour cette livraison."
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Position du livreur récupérée avec succès.",
      data: {
        livraison_id:
          livraison.id,

        commande_id:
          livraison.commande_id,

        statut:
          livraison.statut,

        latitude:
          Number(
            livraison.latitude_livreur
          ),

        longitude:
          Number(
            livraison.longitude_livreur
          ),

        position_mise_a_jour:
          livraison.position_mise_a_jour
      }
    });

  } catch (error) {
    console.error(
      "Erreur récupération position GPS :",
      error
    );

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message:
          "L'identifiant de la livraison est invalide."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la récupération de la position GPS."
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  getMesLivraisons,
  accepterLivraison,
  demarrerLivraison,
  terminerLivraison,
  mettreAJourPosition,
  getPositionLivraison
};