// ─────────────────────────────────────────────────────────────────────
//  Mode secours : réponses construites directement à partir de la base,
//  sans IA, quand le fournisseur est indisponible ou que la réponse générée
//  n'a pas passé le garde-fou. Fiable mais moins conversationnel.
// ─────────────────────────────────────────────────────────────────────
const outils = require('./outils');

const fcfa = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

function decrireCommande(c) {
  const lignes = [`Votre commande ${c.numero} (${c.depart} vers ${c.arrivee}) est au statut « ${c.statut} ».`];
  if (c.livreur) lignes.push(`Livreur : ${c.livreur.nom}.`);
  if (c.suivi_gps?.distance_restante_km != null) {
    lignes.push(`Distance restante estimée : ${String(c.suivi_gps.distance_restante_km).replace('.', ',')} km, soit environ ${c.suivi_gps.duree_restante_estimee_min} min (estimation indicative).`);
    lignes.push('Vous pouvez suivre le livreur en direct depuis la page de suivi de la commande.');
  }
  lignes.push(`Montant : ${fcfa(c.montant_fcfa)}.`);
  return lignes.join(' ');
}

async function repondreEnSecours(question, contexte) {
  const numero = /CMD[-\s]?\d{1,6}/i.exec(question);
  if (numero) {
    const c = await outils.executer('consulter_commande', { numero: numero[0] }, contexte);
    return c.trouve ? decrireCommande(c) : `Je ne dispose d'aucune information sur la commande ${c.numero || numero[0]} : elle n'existe pas dans votre compte. Vérifiez le numéro dans « Mes commandes ».`;
  }
  if (/(o[uù] (en )?est|suivi|suivre|statut|ma commande|mon colis|livreur|arriv|quand)/i.test(question)) {
    const { commandes } = await outils.executer('lister_mes_commandes', { filtre: 'en_cours' }, contexte);
    if (!commandes.length) return "Vous n'avez aucune commande en cours. Retrouvez l'historique de vos livraisons dans « Mes commandes ».";
    const c = await outils.executer('consulter_commande', { numero: commandes[0].numero }, contexte);
    const autres = commandes.length > 1 ? ` Vous avez ${commandes.length} commandes en cours : précisez le numéro pour une autre commande.` : '';
    return decrireCommande(c) + autres;
  }
  if (/(prix|co[uû]t|combien|tarif|cher)/i.test(question)) {
    const { tarification: t } = await outils.executer('informations_service', {}, contexte);
    return `Le prix est calculé automatiquement selon la distance : ${fcfa(t.prix_base_fcfa)} de base plus ${fcfa(t.prix_par_km_fcfa)} par kilomètre, avec un minimum de ${fcfa(t.montant_minimum_fcfa)}. Pour connaître le prix exact de votre trajet, utilisez « Nouvelle commande » : il s'affiche dès que le départ et l'arrivée sont placés.`;
  }
  if (/annul/i.test(question)) {
    return "Vous pouvez annuler une commande tant qu'elle est « En attente » (pas encore validée), depuis sa page de détail. Après validation, contactez l'administration SmartDelivery.";
  }
  if (/(zone|quartier|ville|desserv)/i.test(question)) {
    const { zones_desservies: z } = await outils.executer('informations_service', {}, contexte);
    return `SmartDelivery livre actuellement dans les zones suivantes : ${z.join(', ')}.`;
  }
  return "Je peux vous aider à suivre vos commandes (donnez-moi le numéro, ex. CMD-000123), vous expliquer les tarifs, les zones desservies et le fonctionnement des livraisons.";
}

module.exports = { repondreEnSecours };
