# Phase 7 : espace Client

## Écrans

| Route | Écran | Données |
|---|---|---|
| `/client` | Accueil : actions rapides, commande en cours, commandes récentes | `GET /commandes` |
| `/client/commandes/nouvelle` | Nouvelle commande avec carte | `GET /zones`, `POST /tarification/estimation`, `POST /commandes` |
| `/client/commandes` | Mes commandes : filtres (Toutes, En cours, Livrées, Annulées), recherche, pagination | `GET /commandes?statut=&recherche=&page=` |
| `/client/commandes/:id` | Détail : carte du trajet, livreur, chronologie, actions | `GET /commandes/:id` (actualisé toutes les 15 s) |
| `/client/commandes/:id/modifier` | Modification (statut « En attente » uniquement) | `PATCH /commandes/:id` |

## Créer une commande

1. **Départ (A)** : taper une adresse et choisir une suggestion OpenStreetMap, cliquer sur la carte, ou « Utiliser ma position actuelle ».
2. **Arrivée (B)** : même principe. Les épingles peuvent être déplacées à la souris ou au doigt.
3. **Prix** : dès que A et B sont placés, le serveur calcule la distance et le montant (formule unique du backend). Le client ne saisit jamais de prix.
4. **Colis** : type, poids, zone (proposée automatiquement d'après l'adresse d'arrivée).

**Sans internet** (tuiles et recherche d'adresses indisponibles) : un clic sur la carte place quand même le point et remplit l'adresse avec ses coordonnées GPS, modifiables à la main. La recherche abandonne après 6 secondes.

## Actions selon le statut

| Statut | Libellé | Ce que le client peut faire |
|---|---|---|
| NOUVELLE | En attente | Modifier, annuler (motif facultatif) |
| VALIDEE → EN_COURS | Validée, Affectée, Acceptée, En cours | Suivre, appeler le livreur |
| LIVREE | Livrée | Confirmer la réception + noter le livreur (1 à 5, facultatif) |
| CONFIRMEE / ANNULEE | Terminée / Annulée | Consultation |

Le bouton affiché dépend du statut, mais c'est le **serveur** qui décide : une action envoyée hors de son statut autorisé est refusée (409).

## Carte

- React Leaflet + tuiles OpenStreetMap (attribution affichée, obligatoire).
- Recherche d'adresses : Nominatim (service public OSM, limité au Sénégal, 1 requête/seconde : la saisie attend 0,6 s après la dernière frappe). Pour une mise en production, prévoir un service de géocodage dédié.
- Le suivi GPS du livreur en direct est ajouté en phase 10.

## Tests

- `npm test` (frontend) : 18 tests, dont une non-régression sur la fenêtre de confirmation.
- Scénario navigateur réel (21 vérifications) : création sur la carte, prix, modification, liste, filtres, cycle complet avec admin et livreur, confirmation + note, annulation avec motif, notifications, cloisonnement entre clients.
