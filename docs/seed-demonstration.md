# Données de démonstration (seed)

## Lancer

```bash
# backend/.env : choisir le mot de passe des 3 comptes de démo (sinon il est généré et affiché une fois)
DEMO_MOT_DE_PASSE=Votre-Mot-2026

npm run db:seed                    # crée les données (refuse si elles existent déjà)
npm run db:seed -- --remplacer     # supprime UNIQUEMENT les données de démo puis les recrée (dates remises à jour)
npm run db:seed -- --supprimer     # supprime uniquement les données de démo
npm run db:seed -- --commandes=300 --jours=60   # autre volume
```

Durée : environ 30 secondes. Le jeu de données est **reproductible** : même nombre de commandes et mêmes profils à chaque exécution, avec des dates calculées par rapport au jour du lancement.

## Comptes de démonstration

| Rôle | E-mail | Ce qu'il permet de montrer |
|---|---|---|
| Administrateur | `admin.demo@demo.smartdelivery.sn` | Tableau de bord rempli, carte avec une dizaine de livraisons en cours, statistiques sur 90 jours, 3 rapports PDF, livreurs à valider et suspendus |
| Client | `client.demo@demo.smartdelivery.sn` | Historique de 15 commandes, une **en cours** (suivi GPS en direct), une **livrée à confirmer**, une **en attente** (modifiable), assistant avec historique |
| Livreur | `livreur.demo@demo.smartdelivery.sn` | Plus de 60 livraisons, performances et gains, **une livraison à accepter** pour dérouler le cycle |

Mot de passe : la valeur de `DEMO_MOT_DE_PASSE`. Les autres comptes (« figurants ») ont un mot de passe aléatoire jamais affiché : **aucune connexion possible** avec eux.

## Contenu généré (exécution par défaut)

| Table | Enregistrements | Détail |
|---|---|---|
| utilisateurs | 82 | 2 administrateurs, 61 clients, 19 livreurs |
| clients / livreurs / administrateurs | 61 / 19 / 2 | 15 livreurs actifs (dont ~60 % disponibles), 2 en attente, 2 suspendus |
| commandes | 642 | Sur 90 jours, en croissance, plus d'activité le vendredi et le samedi |
| livraisons | 579 | Dont 35 refus avec motif puis réaffectation |
| positions_gps | ≈ 7 300 | Trajets entre départ et arrivée, pendant la livraison uniquement |
| historique_statuts | ≈ 4 200 | Une ligne par changement de statut, avec son auteur |
| notifications | ≈ 9 500 | Celles produites par l'application ; les anciennes marquées comme lues |
| conversations_ia | ≈ 30 | Réponses calculées à partir de la base (mode secours, sans IA) |
| rapports / kpis | 3 / 21 | Rapports du mois précédent, KPI figés |

Statuts : environ 85 % terminées, 11 % annulées (avant validation, après validation, après affectation) ; aujourd'hui, des commandes à **chaque étape** du cycle.

## Comment le seed respecte le schéma

Le script **n'insère aucune commande directement dans un statut avancé** : les triggers l'interdiraient (une commande naît NOUVELLE, transitions contrôlées, GPS seulement EN_COURS…). Il procède ainsi :

1. **Analyse du schéma** : il vérifie la présence des 15 tables, des valeurs des types énumérés, des triggers métier et des zones, et s'arrête avec un message clair sinon.
2. **Comptes** : insertion des utilisateurs (mot de passe haché bcrypt) et de leur table fille.
3. **Cycle réel** : chaque commande est créée puis avance via les **services du backend** (`commandeService`, `suiviService`). Prix, part du livreur, historique, notifications, distance GPS et note moyenne sont donc calculés exactement comme dans l'application.
4. **Datation** : les dates posées par PostgreSQL sont remplacées par des dates réparties sur la période. Les triggers figent le contenu d'une commande, pas ses dates. Chaque notification est rattachée à l'étape qui l'a produite (même transaction).

## Sécurité et réexécution

- Toutes les données de démo sont rattachées à des comptes `@demo.smartdelivery.sn` : elles sont identifiables et supprimables sans toucher au reste.
- Une 2ᵉ exécution est **refusée** sans `--remplacer`.
- `--remplacer` et `--supprimer` **s'arrêtent sans rien supprimer** si une commande réelle a été livrée par un livreur de démo.
- Les administrateurs réels ne reçoivent pas les notifications de démo.
- Refus automatique si `NODE_ENV=production`.
- Données **fictives** : prénoms et noms courants combinés au hasard, téléphones `7X 000 XX XX`, aucune personne réelle. Les lieux sont des quartiers réels, avec des coordonnées approximatives.

## Vérifications effectuées

12 contrôles SQL d'intégrité, tous à 0 : dates futures, chronologie de l'historique, cohérence statut/historique, dates de livraison, GPS hors période, notes, inscriptions antérieures aux commandes, notifications, notes moyennes, livreurs suspendus. S'y ajoutent un test automatisé (`tests/api/seed.test.js`) et 18 vérifications des tableaux de bord dans le navigateur.

> **Soutenance** : précisez au jury que les chiffres affichés proviennent d'un jeu de démonstration généré par un script respectant toutes les règles métier de la base.
