# Phase 9 : espace Administrateur

## Écrans

| Route | Écran (prototype) | Actions |
|---|---|---|
| `/admin/commandes` | Gestion des commandes | Onglets par étape (À valider, À affecter, En cours, Livrées, Annulées) avec compteurs, recherche, validation rapide, **export CSV** |
| `/admin/commandes/:id` | Détail d'une commande | Valider, **affecter** (manuel ou automatique), annuler avec motif, historique détaillé (auteur de chaque étape) |
| `/admin/livraisons` | Livraisons en cours | Liste actualisée toutes les 15 s (la carte en direct arrive en phase 10) |
| `/admin/utilisateurs` | Gestion des utilisateurs | Onglets Tous / Clients / Livreurs / Administrateurs, filtre de statut, recherche, création (dont administrateurs), modification, suspension, réactivation, suppression |
| `/admin/livreurs` | Gestion des livreurs | Filtres À valider / Disponibles / En livraison / Hors ligne / Suspendus, ajout d'un livreur |
| `/admin/livreurs/:id` | Fiche livreur | Documents (permis, véhicule), **validation du compte**, performances, dernières livraisons |
| `/admin/clients`, `/admin/clients/:id` | Clients | Nombre de commandes, montant dépensé, fiche avec historique |
| `/admin/parametres` | Paramètres | Grille tarifaire avec **aperçu calculé par le serveur** avant enregistrement |

## Affectation d'un livreur

Le panneau liste les livreurs **actifs et disponibles**, triés par distance entre leur dernière position connue et le point de départ. Chaque ligne indique le véhicule, la note, le téléphone et l'état (« Disponible » ou déjà « En livraison »).
- **Manuel** : l'admin choisit un livreur.
- **Automatique** : le serveur choisit le livreur disponible le plus proche, sans livraison en cours, en excluant ceux qui ont déjà refusé cette commande.

## Règles appliquées aux comptes

| Action | Règle (vérifiée par le serveur) |
|---|---|
| Suspendre | Effet immédiat : le jeton déjà émis est refusé. Impossible sur son propre compte, ou sur un livreur en pleine livraison |
| Supprimer | Seulement si le compte n'a aucun historique ; sinon, suspendre (les KPI restent justes) |
| Valider un livreur | Compte « En attente » → « Actif » ; le livreur reçoit une notification |
| Créer un administrateur | Uniquement depuis l'espace admin, jamais par inscription publique |

## Export CSV

Le fichier respecte les filtres en cours. Il est prévu pour Excel en français : séparateur `;`, virgule décimale, heure de Dakar, encodage UTF-8 avec BOM (accents corrects).

## Tests

- Backend : 58 tests, dont `administration.test.js` (filtres par client, livreur, zone et période ; compteurs ; export ; performances) et `admin-gestion.test.js` (simulation de tarif, échappement CSV).
- Navigateur réel (20 vérifications) : validation, affectation au plus proche, notification du livreur, annulation motivée, export, création d'un administrateur, suspension immédiate, suppression refusée, validation d'un livreur avec consultation du permis, fiches livreur et client, paramètres.
