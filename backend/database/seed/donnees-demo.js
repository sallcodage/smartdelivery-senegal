// ─────────────────────────────────────────────────────────────────────
//  Données FICTIVES de démonstration (contexte sénégalais).
//  Aucune personne réelle : prénoms et noms courants combinés au hasard,
//  e-mails sur le domaine réservé demo.smartdelivery.sn, numéros 7X 000 XX XX.
//  Les lieux sont des quartiers réels (coordonnées approximatives, publiques).
// ─────────────────────────────────────────────────────────────────────

const DOMAINE_DEMO = 'demo.smartdelivery.sn';

const PRENOMS_F = ['Aminata', 'Fatou', 'Awa', 'Khady', 'Mariama', 'Ndèye', 'Aïssatou', 'Coumba', 'Astou', 'Bineta',
  'Dieynaba', 'Adja', 'Mame Diarra', 'Rokhaya', 'Seynabou', 'Yacine', 'Ramatoulaye', 'Oumou', 'Sokhna', 'Penda',
  'Marième', 'Nafissatou', 'Fama', 'Kiné', 'Absa'];
const PRENOMS_H = ['Moussa', 'Mamadou', 'Ibrahima', 'Cheikh', 'Abdoulaye', 'Ousmane', 'Modou', 'Babacar', 'Pape', 'Alioune',
  'Serigne', 'Lamine', 'Malick', 'Souleymane', 'Assane', 'Boubacar', 'Omar', 'Amadou', 'Saliou', 'Ibou',
  'El Hadji', 'Djibril', 'Mansour', 'Aliou', 'Samba'];
const NOMS = ['Diop', 'Ndiaye', 'Fall', 'Sow', 'Gueye', 'Ba', 'Sy', 'Mbaye', 'Faye', 'Diallo', 'Sarr', 'Cissé', 'Kane',
  'Thiam', 'Niang', 'Seck', 'Camara', 'Diouf', 'Touré', 'Sène', 'Ndour', 'Dieng', 'Mbengue', 'Wade', 'Kâ', 'Badji',
  'Sall', 'Lô', 'Gaye', 'Tall'];

// Lieux : [libellé d'adresse, latitude, longitude, zone, popularité relative]
const LIEUX = [
  ['Plateau, avenue Léopold Sédar Senghor', 14.6681, -17.4377, 'Dakar', 9],
  ['Marché Sandaga, Plateau', 14.6720, -17.4372, 'Dakar', 8],
  ['Médina, rue 6', 14.6829, -17.4501, 'Dakar', 7],
  ['Colobane, près du marché', 14.6920, -17.4440, 'Dakar', 5],
  ['Fann Résidence', 14.6923, -17.4639, 'Dakar', 5],
  ['Point E, rue de Kaolack', 14.6957, -17.4607, 'Dakar', 6],
  ['Mermoz, VDN', 14.7075, -17.4745, 'Dakar', 7],
  ['Sacré-Cœur 3', 14.7150, -17.4650, 'Dakar', 7],
  ['HLM 5, marché', 14.7105, -17.4470, 'Dakar', 6],
  ['Liberté 6, rond-point', 14.7230, -17.4560, 'Dakar', 7],
  ['Grand Yoff, arafat', 14.7330, -17.4510, 'Dakar', 6],
  ['Hann Maristes', 14.7220, -17.4230, 'Dakar', 5],
  ['Ouakam, cité Comico', 14.7236, -17.4880, 'Dakar', 6],
  ['Ngor, village', 14.7480, -17.5140, 'Dakar', 4],
  ['Almadies, route des Almadies', 14.7453, -17.5134, 'Dakar', 6],
  ['Yoff, Tonghor', 14.7560, -17.4720, 'Dakar', 5],
  ['Parcelles Assainies, unité 17', 14.7650, -17.4400, 'Dakar', 7],
  ['Pikine, Icotaf', 14.7550, -17.3950, 'Pikine', 5],
  ['Thiaroye, gare', 14.7470, -17.3800, 'Pikine', 4],
  ['Pikine, rue 10', 14.7610, -17.3990, 'Pikine', 3],
  ['Guédiawaye, Golf Sud', 14.7780, -17.3990, 'Guédiawaye', 4],
  ['Guédiawaye, Sam Notaire', 14.7830, -17.4060, 'Guédiawaye', 3],
  ['Keur Massar, marché', 14.7830, -17.3150, 'Keur Massar', 3],
  ['Keur Massar, Jaxaay', 14.7660, -17.2870, 'Keur Massar', 2],
  ['Rufisque, centre-ville', 14.7160, -17.2730, 'Rufisque', 3],
  ['Bargny, route nationale', 14.6970, -17.2290, 'Rufisque', 1],
  ['Diamniadio, pôle urbain', 14.7280, -17.1840, 'Rufisque', 2],
  ['Thiès, centre-ville', 14.7910, -16.9260, 'Thiès', 1],
];

const REPERES = ['', '', '', ', près de la pharmacie', ', en face de la mosquée', ', immeuble bleu', ', à côté de la boulangerie',
  ', près de l\'école', ', portail vert', ', 2e étage'];

const MOTIFS_REFUS = ['Panne de moto', 'Trop éloigné de ma position actuelle', 'Crevaison', 'Déjà en route pour une autre course',
  'Problème de santé', 'Embouteillages importants sur le trajet'];
const MOTIFS_ANNULATION_CLIENT = ['Je n\'ai plus besoin de cette livraison', 'Erreur dans l\'adresse', 'Je viendrai récupérer le colis moi-même',
  'Commande passée en double'];
const MOTIFS_ANNULATION_ADMIN = ['Adresse de livraison hors zone desservie', 'Client injoignable', 'Colis non conforme (trop volumineux)',
  'Aucun livreur disponible sur le créneau demandé', 'Annulation à la demande du client'];

// Questions posées à l'assistant (les réponses sont calculées à partir de la base)
const QUESTIONS_ASSISTANT = [
  (n) => `Ma commande ${n} est-elle bien livrée ?`,
  (n) => `Où en est ma commande ${n} ?`,
  () => 'Combien coûte une livraison à Dakar ?',
  () => 'Quelles zones desservez-vous ?',
  () => 'Comment annuler une commande ?',
];

module.exports = {
  DOMAINE_DEMO, PRENOMS_F, PRENOMS_H, NOMS, LIEUX, REPERES,
  MOTIFS_REFUS, MOTIFS_ANNULATION_CLIENT, MOTIFS_ANNULATION_ADMIN, QUESTIONS_ASSISTANT,
};
