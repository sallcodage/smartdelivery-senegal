import { Badge } from '../ui/Divers';

const STATUTS_COMPTE = { ACTIF: ['Actif', 'vert'], INACTIF: ['Suspendu', 'rouge'], EN_ATTENTE: ['En attente', 'orange'] };
export const StatutCompte = ({ statut }) => { const [l, t] = STATUTS_COMPTE[statut] || [statut, 'gris']; return <Badge ton={t}>{l}</Badge>; };

const ETATS = { DISPONIBLE: ['Disponible', 'vert'], EN_LIVRAISON: ['En livraison', 'bleu'], HORS_LIGNE: ['Hors ligne', 'gris'] };
export const EtatLivreur = ({ etat }) => { const [l, t] = ETATS[etat] || [etat, 'gris']; return <Badge ton={t}>{l}</Badge>; };

const ROLES = { ADMIN: ['Administrateur', 'violet'], CLIENT: ['Client', 'bleu'], LIVREUR: ['Livreur', 'vert'] };
export const RoleUtilisateur = ({ role }) => { const [l, t] = ROLES[role] || [role, 'gris']; return <Badge ton={t}>{l}</Badge>; };
