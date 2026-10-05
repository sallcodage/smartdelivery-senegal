import { FileText, Package, UtensilsCrossed, Boxes } from 'lucide-react';

export const TYPES_COLIS = [
  { valeur: 'DOCUMENTS', libelle: 'Documents', icone: FileText },
  { valeur: 'PRODUITS', libelle: 'Produits', icone: Package },
  { valeur: 'NOURRITURE', libelle: 'Nourriture', icone: UtensilsCrossed },
  { valeur: 'AUTRES', libelle: 'Autres', icone: Boxes },
];
export const libelleTypeColis = (v) => TYPES_COLIS.find((t) => t.valeur === v)?.libelle || v;

// Regroupements utilisés par les filtres « Mes commandes »
export const FILTRES_COMMANDES = [
  { cle: 'toutes', libelle: 'Toutes', statuts: '' },
  { cle: 'en-cours', libelle: 'En cours', statuts: 'NOUVELLE,VALIDEE,LIVREUR_AFFECTE,ACCEPTEE,EN_COURS' },
  { cle: 'livrees', libelle: 'Livrées', statuts: 'LIVREE,CONFIRMEE' },
  { cle: 'annulees', libelle: 'Annulées', statuts: 'ANNULEE' },
];

export const STATUTS_ACTIFS = ['NOUVELLE', 'VALIDEE', 'LIVREUR_AFFECTE', 'ACCEPTEE', 'EN_COURS'];
export const STATUTS_FINAUX = ['CONFIRMEE', 'ANNULEE'];

// Parcours normal d'une commande (chronologie)
export const ETAPES = [
  { statut: 'NOUVELLE', libelle: 'Commande créée' },
  { statut: 'VALIDEE', libelle: 'Commande validée' },
  { statut: 'LIVREUR_AFFECTE', libelle: 'Livreur affecté' },
  { statut: 'ACCEPTEE', libelle: 'Livraison acceptée' },
  { statut: 'EN_COURS', libelle: 'Colis en route' },
  { statut: 'LIVREE', libelle: 'Colis livré' },
  { statut: 'CONFIRMEE', libelle: 'Réception confirmée' },
];

// Explication affichée au client selon l'état de sa commande
export const EXPLICATIONS_CLIENT = {
  NOUVELLE: "Votre commande attend la validation de l'équipe SmartDelivery. Vous pouvez encore la modifier ou l'annuler.",
  VALIDEE: 'Votre commande est validée. Un livreur va lui être affecté.',
  LIVREUR_AFFECTE: "Un livreur a été affecté. Il doit confirmer qu'il prend en charge la livraison.",
  ACCEPTEE: 'Le livreur a accepté la livraison et se prépare à récupérer le colis.',
  EN_COURS: 'Votre colis est en route.',
  LIVREE: 'Le livreur a indiqué avoir livré le colis. Confirmez sa réception.',
  CONFIRMEE: 'Livraison terminée. Merci d\'avoir utilisé SmartDelivery !',
  ANNULEE: 'Cette commande a été annulée.',
};

// Centre de la carte : Dakar
export const CENTRE_DAKAR = [14.7167, -17.4677];

// Explication affichée au livreur selon l'état de la livraison
export const EXPLICATIONS_LIVREUR = {
  LIVREUR_AFFECTE: "Cette livraison vous a été affectée. Acceptez-la ou refusez-la en indiquant un motif.",
  ACCEPTEE: 'Récupérez le colis au point de départ (A), puis démarrez la livraison.',
  EN_COURS: 'Livraison en cours : votre position est partagée avec le client.',
  LIVREE: 'Livraison effectuée. Le client doit confirmer la réception.',
  CONFIRMEE: 'Le client a confirmé la réception. Livraison terminée.',
  ANNULEE: 'Cette livraison a été annulée.',
};
