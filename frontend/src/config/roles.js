// Espace d'accueil de chaque rôle (le rôle vient du compte en base, jamais d'un choix à la connexion)
export const ACCUEIL_PAR_ROLE = { ADMIN: '/admin', CLIENT: '/client', LIVREUR: '/livreur' };

export const cheminAccueil = (role) => ACCUEIL_PAR_ROLE[role] || '/connexion';

export const LIBELLES_ROLE = { ADMIN: 'Administrateur', CLIENT: 'Client', LIVREUR: 'Livreur' };

export const VEHICULES = [
  { valeur: 'MOTO', libelle: 'Moto' },
  { valeur: 'SCOOTER', libelle: 'Scooter' },
  { valeur: 'VELO', libelle: 'Vélo' },
  { valeur: 'VOITURE', libelle: 'Voiture' },
];
export const libelleVehicule = (v) => VEHICULES.find((x) => x.valeur === v)?.libelle || v;
