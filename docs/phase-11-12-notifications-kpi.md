# Phases 11 et 12 : notifications et indicateurs de performance

## Notifications (phase 11)

Chaque changement de statut crée ses notifications **dans la même transaction** que le changement : impossible d'avoir une commande livrée sans notification, ou l'inverse.

| Événement | Client | Livreur | Administrateurs |
|---|---|---|---|
| Commande créée | ✔ (avec le montant) | | ✔ à valider |
| Validée | ✔ | | |
| Livreur affecté | ✔ (nom du livreur) | ✔ accepter / refuser | |
| Acceptée | ✔ | | ✔ |
| Refusée (motif) | | | ✔ à réaffecter |
| En route | ✔ suivre en direct | | |
| Livrée | ✔ confirmer la réception | | ✔ |
| Réception confirmée (note) | | ✔ (note) | ✔ |
| Annulée | (si par l'admin) ✔ + motif | ✔ si affecté | ✔ si par le client |
| Inscription livreur / validation | | ✔ compte validé | ✔ à valider |

Le test `notifications.test.js` parcourt tout le cycle et vérifie, pour chaque destinataire, le **nombre exact** de messages, leur texte, l'absence de doublon et le cloisonnement (chacun ne lit et ne modifie que ses notifications).

## Indicateurs (phase 12)

Calculés en SQL par `backend/src/services/kpiService.js`, route `GET /api/admin/kpi?periode=7j|30j|90j|12m|tout`.

| KPI du cahier des charges | Définition (validée en phase 1) |
|---|---|
| **Nombre de livraisons** | Commandes au statut Livrée ou Terminée |
| **Taux de réussite** | Livrées ÷ (livrées + annulées **après** validation). Une annulation par le client avant validation n'est pas un échec de livraison |
| **Temps de livraison** | Moyenne de (fin − démarrage) ; le délai total (commande → livraison) est aussi affiché |
| **Performance des livreurs** | Classement par livraisons effectuées, distance et note (tableau de bord) ; fiche détaillée par livreur |
| Chiffre d'affaires | Somme des commandes confirmées par le client |
| Panier moyen, satisfaction | Moyenne des montants confirmés ; moyenne des notes clients |

La période s'applique à la date de création des commandes. Les courbes sont regroupées par jour (7 et 30 jours), par semaine (3 mois) ou par mois (1 an, tout). Dakar étant à UTC+0, aucun décalage horaire n'est à gérer.

## Écrans

- **Tableau de bord** (prototype « Dashboard Administrateur ») : 8 KPI, évolution des commandes, statut des commandes, top livreurs, mini-carte des livraisons en temps réel.
- **Statistiques** (prototype « Analytique / Rapports ») : périodes 7 jours à Tout, revenus, types de colis, zones les plus actives, commandes par jour, export CSV de la période.

## Tests

- Backend : 63 tests. Les KPI sont vérifiés par **écart avant/après** un jeu d'actions connu (3 commandes : une livrée et notée, une annulée après validation, une en attente).
- Navigateur : 14 vérifications. Chaque chiffre affiché est comparé à la valeur de l'API, y compris après changement de période.
