# Phase 10 : géolocalisation et cartes en temps réel

## Chaîne complète d'une position GPS

```
Téléphone du livreur ──(GPS du navigateur, ~10 s)──► POST /commandes/:id/positions ──► table positions_gps
                                                                                         │
Client : /client/commandes/:id/suivi ◄──(toutes les 5 s)── GET /commandes/:id/suivi ◄──┤
Admin  : /admin/livraisons          ◄──(toutes les 10 s)─ GET /admin/livraisons/actives ◄┘
```

L'actualisation se fait par **interrogation périodique** (décision n° 18 de la phase 1) : simple, robuste sur un réseau mobile et facile à expliquer. Le marqueur du livreur glisse entre deux positions (animation CSS) au lieu de « sauter ».

## Écrans

| Écran | Contenu |
|---|---|
| Client : Suivi de commande (`/client/commandes/:id/suivi`) | Carte avec départ (A), arrivée (B), livreur en direct, trajet parcouru (bleu) et restant (pointillés), durée et distance restantes, appel du livreur, alerte si le GPS du livreur ne répond plus depuis 2 min |
| Admin : Carte des livraisons (`/admin/livraisons`) | Liste des livraisons en cours + carte de tous les livreurs ; clic sur une livraison → zoom et fiche (livreur, client, statut, distance et durée restantes) ; livreurs disponibles en option (points verts) ; positions de plus de 15 min signalées |
| Livreur : Navigation GPS (phase 8) | Source des positions |

## Règles de confidentialité

- Le **client** ne voit la position du livreur **que pendant la livraison** (statut En cours). Avant le départ, la carte n'affiche que A et B.
- L'**admin** voit la dernière position connue de chaque livreur (supervision et affectation au plus proche).
- Un client ou un livreur ne peut consulter que le suivi de ses propres commandes (404 sinon).

## Calculs

- **Distance restante** : distance à vol d'oiseau (Haversine) entre la dernière position et l'arrivée.
- **Durée estimée** : distance restante ÷ 20 km/h (vitesse moyenne urbaine, `frontend/src/utils/geo.js`). C'est une estimation indicative, signalée comme telle à l'écran.
- **Distance parcourue** : somme des segments entre positions GPS successives.

## Tests

- Backend : 59 tests, dont la position de repli de la carte admin (trajet en cours, sinon dernière position connue, sinon aucune).
- Navigateur, **trois sessions simultanées** (livreur, client, admin), 9 vérifications : position masquée avant le départ, livreur visible dès le démarrage, carte du client actualisée seule de 9,5 km à 3,6 km restants pendant que le GPS du livreur avance (Médina, Fann, Mermoz, Ouakam), fiche sur la carte admin, mise à jour côté admin, arrêt du suivi à la livraison.
