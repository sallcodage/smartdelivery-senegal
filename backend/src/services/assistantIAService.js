// ======================================================
// SERVICE ASSISTANT IA
// ======================================================

/**
 * Génère une réponse de l'assistant SmartDelivery.
 *
 * Cette première version fonctionne localement.
 * Elle permettra de tester :
 * - les routes
 * - l'authentification CLIENT
 * - l'enregistrement PostgreSQL
 *
 * Un véritable modèle d'IA pourra ensuite être connecté ici.
 */
const genererReponseIA = async (question) => {
  const questionNormalisee = question
    .toLowerCase()
    .trim();

  // ====================================================
  // SALUTATIONS
  // ====================================================
  if (
    questionNormalisee.includes("bonjour") ||
    questionNormalisee.includes("salut") ||
    questionNormalisee.includes("bonsoir")
  ) {
    return (
      "Bonjour ! Je suis l'assistant SmartDelivery Sénégal. " +
      "Je peux vous aider concernant vos commandes et vos livraisons."
    );
  }

  // ====================================================
  // SUIVI D'UNE COMMANDE
  // ====================================================
  if (
    questionNormalisee.includes("suivre") ||
    questionNormalisee.includes("suivi") ||
    questionNormalisee.includes("où est ma commande") ||
    questionNormalisee.includes("ou est ma commande")
  ) {
    return (
      "Vous pouvez suivre votre commande depuis la section " +
      "« Mes commandes », puis cliquer sur « Suivre la livraison »."
    );
  }

  // ====================================================
  // RETARD DE LIVRAISON
  // ====================================================
  if (
    questionNormalisee.includes("retard") ||
    questionNormalisee.includes("en retard")
  ) {
    return (
      "Si votre livraison est en retard, consultez son statut " +
      "dans la section « Mes commandes ». Vous pourrez également " +
      "suivre la position du livreur lorsque la livraison est en cours."
    );
  }

  // ====================================================
  // ANNULATION
  // ====================================================
  if (
    questionNormalisee.includes("annuler") ||
    questionNormalisee.includes("annulation")
  ) {
    return (
      "L'annulation d'une commande dépend de son statut actuel. " +
      "Une commande déjà en cours de livraison peut ne plus être annulable."
    );
  }

  // ====================================================
  // LIVREUR
  // ====================================================
  if (
    questionNormalisee.includes("livreur")
  ) {
    return (
      "Lorsqu'un livreur est affecté à votre commande, " +
      "SmartDelivery permet de suivre l'évolution de la livraison."
    );
  }

  // ====================================================
  // AIDE GENERALE
  // ====================================================
  if (
    questionNormalisee.includes("aide") ||
    questionNormalisee.includes("comment ça marche") ||
    questionNormalisee.includes("comment ca marche")
  ) {
    return (
      "SmartDelivery Sénégal vous permet de gérer vos commandes, " +
      "suivre vos livraisons et consulter leur progression. " +
      "Posez-moi une question concernant votre commande ou votre livraison."
    );
  }

  // ====================================================
  // REPONSE PAR DEFAUT
  // ====================================================
  return (
    "Je n'ai pas encore suffisamment d'informations pour répondre " +
    "précisément à cette question. Vous pouvez me poser une question " +
    "concernant votre commande, son suivi, un retard ou votre livraison."
  );
};


module.exports = {
  genererReponseIA
};