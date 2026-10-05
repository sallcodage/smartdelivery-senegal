# Phase 8 : espace Livreur

## Écrans

| Route | Écran (prototype) | Données |
|---|---|---|
| `/livreur` | Accueil : disponibilité, compteurs, livraison en cours, prochaines livraisons | `GET /commandes` |
| `/livreur/livraisons` | Mes livraisons : « En cours » et « À accepter » (actualisé toutes les 30 s) | `GET /commandes?statut=` |
| `/livreur/livraisons/:id` | Détail livraison : client, trajet, gain, accepter / refuser / démarrer | `GET /commandes/:id`, `POST …/accepter`, `…/refuser`, `…/demarrer` |
| `/livreur/livraisons/:id/en-cours` | Navigation GPS : carte, trajet parcouru, distance restante, durée estimée | `GET …/suivi`, `POST …/positions`, `POST …/terminer` |
| `/livreur/livraisons/:id/terminee` | Fin de livraison : durée, distance parcourue, gain | `GET /commandes/:id` |
| `/livreur/historique` | Livraisons effectuées + totaux | `GET /commandes?statut=LIVREE,CONFIRMEE` |
| `/livreur/performances` | Indicateurs et graphiques (7 j / 30 j / tout) | `GET /livreurs/moi/performances` |

## Parcours du livreur

1. **Disponibilité** : l'interrupteur de l'accueil. Disponible, sa position est transmise toutes les minutes (affectation automatique au plus proche).
2. **Livraison affectée** : il l'accepte, ou la refuse avec un **motif obligatoire** (l'admin est notifié et la réaffecte).
3. **Démarrer** : après avoir récupéré le colis. Le partage de position passe en mode livraison (environ toutes les 10 s, ou dès 15 m de déplacement), sur toutes les pages de son espace.
4. **Navigation GPS** : sa position (icône bleue), le trajet déjà parcouru, la distance restante et une durée estimée à 20 km/h (vitesse moyenne urbaine, modifiable dans `utils/geo.js`).
5. **Terminer** : statut « Livrée » ; la distance réellement parcourue est calculée à partir des positions GPS. Le client confirme ensuite la réception et peut noter le livreur.

## Performances (calculées en SQL sur les données réelles)

| Indicateur | Calcul |
|---|---|
| Livraisons effectuées | Livraisons au statut Livrée ou Terminée sur la période |
| Gains | Somme de la part livreur (`livraisons.montant`) |
| Taux d'acceptation | Acceptées ÷ (acceptées + refusées), d'après l'historique des statuts |
| Temps moyen de livraison | Moyenne de `date_fin − date_debut` |
| Distance parcourue | Somme des distances calculées depuis le GPS |
| Note moyenne | Moyenne des notes données par les clients |

## Démonstration sans se déplacer

En mode développement (`npm run dev`), l'écran de navigation propose **« Simuler le trajet (démonstration) »** : la position avance du point actuel vers l'arrivée, un point toutes les 3 s. Les positions passent par la vraie API et sont enregistrées en base, comme un GPS réel : le client et l'admin voient donc le livreur avancer. En production, ce bouton est masqué (réactivable avec `VITE_SIMULATION_GPS=true`).

Sur téléphone, le navigateur demande l'autorisation de localisation ; la géolocalisation exige **HTTPS** (ou `localhost`).

## Tests

- Backend : 51 tests (dont le calcul des performances : refus, taux d'acceptation, gains, distance, courbe).
- Navigateur réel avec GPS simulé par coordonnées de Dakar (16 vérifications) : accueil, position transmise, refus motivé, acceptation, démarrage, 4 positions enregistrées, distance restante, fin, historique, performances, notifications, barre mobile.
