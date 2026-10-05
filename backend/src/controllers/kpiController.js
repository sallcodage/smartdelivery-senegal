const pool = require("../config/database");


// ======================================================
// TABLEAU DE BORD KPI ADMINISTRATEUR
// GET /api/kpi/dashboard
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const getDashboardKPI = async (req, res) => {
  try {

    // ==================================================
    // 1. NOMBRE TOTAL DE COMMANDES
    // ==================================================
    const totalCommandesResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM commandes
    `);


    // ==================================================
    // 2. COMMANDES CONFIRMEES
    // ==================================================
    const commandesConfirmeesResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM commandes
      WHERE statut = 'CONFIRMEE'
    `);


    // ==================================================
    // 3. COMMANDES ANNULEES
    // ==================================================
    const commandesAnnuleesResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM commandes
      WHERE statut = 'ANNULEE'
    `);


    // ==================================================
    // 4. LIVRAISONS EN COURS
    // ==================================================
    const livraisonsEnCoursResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM livraisons
      WHERE statut = 'EN_COURS'
    `);


    // ==================================================
    // 5. NOMBRE TOTAL DE LIVREURS
    // ==================================================
    const totalLivreursResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM livreurs
    `);


    // ==================================================
    // 6. LIVREURS DISPONIBLES
    // ==================================================
    const livreursDisponiblesResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM livreurs
      WHERE disponibilite = true
    `);


    // ==================================================
    // 7. CHIFFRE D'AFFAIRES
    // COMMANDES CONFIRMEES UNIQUEMENT
    // ==================================================
    const chiffreAffairesResult = await pool.query(`
      SELECT COALESCE(SUM(montant), 0) AS total
      FROM commandes
      WHERE statut = 'CONFIRMEE'
    `);


    // ==================================================
    // 8. TAUX DE REUSSITE
    // ==================================================
    const tauxReussiteResult = await pool.query(`
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            (
              COUNT(*) FILTER (
                WHERE statut = 'CONFIRMEE'
              )::numeric
              / COUNT(*)::numeric
            ) * 100,
            2
          )
        END AS taux
      FROM commandes
    `);


    // ==================================================
    // CONVERSION DES RESULTATS
    // ==================================================
    const totalCommandes =
      totalCommandesResult.rows[0].total;

    const commandesConfirmees =
      commandesConfirmeesResult.rows[0].total;

    const commandesAnnulees =
      commandesAnnuleesResult.rows[0].total;

    const livraisonsEnCours =
      livraisonsEnCoursResult.rows[0].total;

    const totalLivreurs =
      totalLivreursResult.rows[0].total;

    const livreursDisponibles =
      livreursDisponiblesResult.rows[0].total;

    const chiffreAffaires =
      Number(chiffreAffairesResult.rows[0].total);

    const tauxReussite =
      Number(tauxReussiteResult.rows[0].taux);


    // ==================================================
    // REPONSE
    // ==================================================
    return res.status(200).json({
      success: true,
      message: "KPI du tableau de bord récupérés avec succès.",
      data: {
        total_commandes: totalCommandes,
        commandes_confirmees: commandesConfirmees,
        commandes_annulees: commandesAnnulees,
        livraisons_en_cours: livraisonsEnCours,
        total_livreurs: totalLivreurs,
        livreurs_disponibles: livreursDisponibles,
        chiffre_affaires: chiffreAffaires,
        taux_reussite: tauxReussite
      }
    });

  } catch (error) {
    console.error(
      "Erreur récupération KPI dashboard :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la récupération des KPI."
    });
  }
};


// ======================================================
// KPI AVANCES
// GET /api/kpi/avances
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const getKPIAvances = async (req, res) => {
  try {

    // ==================================================
    // 1. TEMPS MOYEN DE LIVRAISON EN MINUTES
    // ==================================================
    const tempsMoyenResult = await pool.query(`
      SELECT
        COALESCE(
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (date_fin - date_debut)) / 60
            )::numeric,
            2
          ),
          0
        ) AS temps_moyen_minutes
      FROM livraisons
      WHERE statut = 'TERMINEE'
        AND date_debut IS NOT NULL
        AND date_fin IS NOT NULL
    `);


    // ==================================================
    // 2. DISTANCE MOYENNE DES LIVRAISONS
    // ==================================================
    const distanceMoyenneResult = await pool.query(`
      SELECT
        COALESCE(
          ROUND(
            AVG(distance)::numeric,
            2
          ),
          0
        ) AS distance_moyenne
      FROM livraisons
      WHERE distance IS NOT NULL
    `);


    // ==================================================
    // 3. MONTANT MOYEN DES COMMANDES
    // ==================================================
    const montantMoyenResult = await pool.query(`
      SELECT
        COALESCE(
          ROUND(
            AVG(montant)::numeric,
            2
          ),
          0
        ) AS montant_moyen
      FROM commandes
    `);


    // ==================================================
    // 4. TAUX D'ANNULATION
    // ==================================================
    const tauxAnnulationResult = await pool.query(`
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            (
              COUNT(*) FILTER (
                WHERE statut = 'ANNULEE'
              )::numeric
              / COUNT(*)::numeric
            ) * 100,
            2
          )
        END AS taux_annulation
      FROM commandes
    `);


    // ==================================================
    // CONVERSION DES RESULTATS
    // ==================================================
    const tempsMoyenLivraison = Number(
      tempsMoyenResult.rows[0].temps_moyen_minutes
    );

    const distanceMoyenne = Number(
      distanceMoyenneResult.rows[0].distance_moyenne
    );

    const montantMoyenCommandes = Number(
      montantMoyenResult.rows[0].montant_moyen
    );

    const tauxAnnulation = Number(
      tauxAnnulationResult.rows[0].taux_annulation
    );


    // ==================================================
    // REPONSE
    // ==================================================
    return res.status(200).json({
      success: true,
      message: "KPI avancés récupérés avec succès.",
      data: {
        temps_moyen_livraison_minutes:
          tempsMoyenLivraison,

        distance_moyenne_km:
          distanceMoyenne,

        montant_moyen_commandes:
          montantMoyenCommandes,

        taux_annulation:
          tauxAnnulation
      }
    });

  } catch (error) {
    console.error(
      "Erreur récupération KPI avancés :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la récupération des KPI avancés."
    });
  }
};
// ======================================================
// PERFORMANCE DES LIVREURS
// GET /api/kpi/performance-livreurs
// ADMINISTRATEUR UNIQUEMENT
// ======================================================
const getPerformanceLivreurs = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.telephone,

        l.vehicule,
        l.disponibilite,
        l.note_moyenne,

        COUNT(li.id)::int AS total_livraisons,

        COUNT(li.id) FILTER (
          WHERE li.statut = 'TERMINEE'
        )::int AS livraisons_terminees,

        COUNT(li.id) FILTER (
          WHERE li.statut = 'EN_COURS'
        )::int AS livraisons_en_cours,

        COUNT(li.id) FILTER (
          WHERE li.statut = 'ANNULEE'
        )::int AS livraisons_annulees,

        CASE
          WHEN COUNT(li.id) = 0 THEN 0
          ELSE ROUND(
            (
              COUNT(li.id) FILTER (
                WHERE li.statut = 'TERMINEE'
              )::numeric
              / COUNT(li.id)::numeric
            ) * 100,
            2
          )
        END AS taux_reussite,

        COALESCE(
          ROUND(
            AVG(
              EXTRACT(
                EPOCH FROM (li.date_fin - li.date_debut)
              ) / 60
            ) FILTER (
              WHERE li.statut = 'TERMINEE'
                AND li.date_debut IS NOT NULL
                AND li.date_fin IS NOT NULL
            )::numeric,
            2
          ),
          0
        ) AS temps_moyen_minutes

      FROM livreurs l

      INNER JOIN utilisateurs u
        ON u.id = l.id

      LEFT JOIN livraisons li
        ON li.livreur_id = l.id

      GROUP BY
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.telephone,
        l.vehicule,
        l.disponibilite,
        l.note_moyenne

      ORDER BY
        livraisons_terminees DESC,
        u.nom ASC
    `);

    const livreurs = result.rows.map((livreur) => ({
      id: livreur.id,
      nom: livreur.nom,
      prenom: livreur.prenom,
      email: livreur.email,
      telephone: livreur.telephone,

      vehicule: livreur.vehicule,
      disponibilite: livreur.disponibilite,

      note_moyenne:
        Number(livreur.note_moyenne || 0),

      total_livraisons:
        livreur.total_livraisons,

      livraisons_terminees:
        livreur.livraisons_terminees,

      livraisons_en_cours:
        livreur.livraisons_en_cours,

      livraisons_annulees:
        livreur.livraisons_annulees,

      taux_reussite:
        Number(livreur.taux_reussite),

      temps_moyen_livraison_minutes:
        Number(livreur.temps_moyen_minutes)
    }));


    return res.status(200).json({
      success: true,
      message:
        "Performances des livreurs récupérées avec succès.",
      data: {
        nombre_livreurs: livreurs.length,
        livreurs
      }
    });

  } catch (error) {
    console.error(
      "Erreur récupération performances livreurs :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la récupération des performances des livreurs."
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  getDashboardKPI,
  getKPIAvances,
  getPerformanceLivreurs
};