import { TYPES_COLIS } from '../../config/commandes';

export const PERIODES_KPI = [
  { cle: '7j', libelle: '7 jours', long: '7 derniers jours' },
  { cle: '30j', libelle: '30 jours', long: '30 derniers jours' },
  { cle: '90j', libelle: '3 mois', long: '3 derniers mois' },
  { cle: '12m', libelle: '1 an', long: '12 derniers mois' },
  { cle: 'tout', libelle: 'Tout', long: 'Depuis le début' },
];

// Statuts regroupés comme sur le prototype (En attente, Affectées, En cours, Livrées, Annulées)
export function partsStatuts(statuts) {
  const n = (...cles) => cles.reduce((t, c) => t + (statuts[c] || 0), 0);
  return [
    { libelle: 'En attente', valeur: n('NOUVELLE', 'VALIDEE'), couleur: '#f59e0b' },
    { libelle: 'Affectées', valeur: n('LIVREUR_AFFECTE', 'ACCEPTEE'), couleur: '#7c3aed' },
    { libelle: 'En cours', valeur: n('EN_COURS'), couleur: '#2563eb' },
    { libelle: 'Livrées', valeur: n('LIVREE', 'CONFIRMEE'), couleur: '#16a34a' },
    { libelle: 'Annulées', valeur: n('ANNULEE'), couleur: '#dc2626' },
  ];
}

export const partsColis = (typesColis) => typesColis.map((t) => ({
  libelle: TYPES_COLIS.find((x) => x.valeur === t.type)?.libelle || t.type, valeur: t.n, pourcentage: t.pourcentage,
}));

export const formaterDuree = (min) => {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
};
