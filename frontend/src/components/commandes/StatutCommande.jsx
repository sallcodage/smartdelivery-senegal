import { Badge } from '../ui/Divers';

// Couleurs alignées sur le prototype : En attente (orange), Affectée / En cours (bleu), Terminée (vert), Annulée (rouge)
const STATUTS = {
  NOUVELLE: { libelle: 'En attente', ton: 'orange' },
  VALIDEE: { libelle: 'Validée', ton: 'violet' },
  LIVREUR_AFFECTE: { libelle: 'Affectée', ton: 'bleu' },
  ACCEPTEE: { libelle: 'Acceptée', ton: 'bleu' },
  EN_COURS: { libelle: 'En cours', ton: 'bleu' },
  LIVREE: { libelle: 'Livrée', ton: 'vert' },
  CONFIRMEE: { libelle: 'Terminée', ton: 'vert' },
  ANNULEE: { libelle: 'Annulée', ton: 'rouge' },
};

export const libelleStatut = (statut) => STATUTS[statut]?.libelle || statut;

export default function StatutCommande({ statut }) {
  const s = STATUTS[statut] || { libelle: statut, ton: 'gris' };
  return <Badge ton={s.ton}>{s.libelle}</Badge>;
}
