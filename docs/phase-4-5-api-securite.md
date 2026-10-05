# Phases 4 et 5 : API REST et sécurité

## Lancer l'API

```bash
cd backend
npm install
cp .env.example .env           # compléter DATABASE_URL et JWT_SECRET
npm run db:reset               # (re)crée le schéma : la phase 4 a ajouté 3 colonnes à « livreurs »
npm run db:admin               # premier administrateur
npm run dev                    # http://localhost:4000/api
```

## Lancer les tests

Les tests utilisent une base **séparée**, entièrement effacée à chaque lancement.

```sql
CREATE DATABASE smartdelivery_test OWNER smartdelivery;
```
```bash
cp .env.test.example .env.test   # compléter le mot de passe PostgreSQL
npm test                         # 43 tests d'API (Jest + Supertest)
npm run test:db                  # 32 vérifications des règles en base
```

## Architecture du backend

```
src/
├── app.js / server.js      Application Express / démarrage
├── config/                 .env, pool PostgreSQL, transactions
├── routes/                 URL → middlewares → contrôleur
├── middleware/             authentifier (JWT), autoriser (rôle), valider, limiteur, erreurs
├── validators/             règles express-validator
├── controllers/            lecture de la requête, envoi de la réponse
├── services/               logique métier + SQL
└── utils/                  géo (Haversine), pagination, format, constantes
```

Trajet d'une requête : `route → authentifier → autoriser → valider → contrôleur → service → PostgreSQL`.

## Routes

Toutes les routes sont préfixées par `/api`. 🔒 = jeton JWT requis.

| Méthode | Route | Rôle | Rôle métier |
|---|---|---|---|
| GET | `/sante` | Public | État de l'API et de la base |
| POST | `/auth/inscription/client` | Public | Inscription client (compte actif) |
| POST | `/auth/inscription/livreur` | Public | Inscription livreur (compte EN_ATTENTE) |
| POST | `/auth/connexion` | Public | Renvoie `jeton` + `utilisateur.role` |
| POST | `/auth/deconnexion` | 🔒 | Le client supprime son jeton |
| GET | `/auth/moi` | 🔒 | Utilisateur connecté |
| POST | `/auth/mot-de-passe-oublie` | Public | Génère un lien valable 30 min |
| POST | `/auth/reinitialiser-mot-de-passe` | Public | Lien à usage unique |
| GET / PATCH | `/profil` | 🔒 Tous | Consulter / modifier ses informations |
| PATCH | `/profil/mot-de-passe` | 🔒 Tous | Ancien mot de passe exigé |
| GET | `/zones` | Public | Zones de livraison |
| GET | `/tarification` | 🔒 | Paramètres de prix |
| POST | `/tarification/estimation` | 🔒 | Distance + montant d'un trajet |
| GET | `/commandes` | 🔒 | Client : les siennes · Livreur : les siennes · Admin : toutes |
| POST | `/commandes` | 🔒 Client | Création (montant calculé par le serveur) |
| GET | `/commandes/:id` | 🔒 | Détail + historique des statuts |
| PATCH | `/commandes/:id` | 🔒 Client | Modification tant que NOUVELLE |
| POST | `/commandes/:id/valider` | 🔒 Admin | NOUVELLE → VALIDEE |
| POST | `/commandes/:id/affecter` | 🔒 Admin | `{livreurId}` ou `{automatique: true}` |
| POST | `/commandes/:id/accepter` | 🔒 Livreur affecté | → ACCEPTEE |
| POST | `/commandes/:id/refuser` | 🔒 Livreur affecté | `{motif}` → retour à VALIDEE |
| POST | `/commandes/:id/demarrer` | 🔒 Livreur affecté | → EN_COURS |
| POST | `/commandes/:id/terminer` | 🔒 Livreur affecté | → LIVREE |
| POST | `/commandes/:id/confirmer` | 🔒 Client | `{note?}` → CONFIRMEE |
| POST | `/commandes/:id/annuler` | 🔒 Client / Admin | Client : NOUVELLE · Admin : jusqu'à LIVREUR_AFFECTE |
| POST | `/commandes/:id/positions` | 🔒 Livreur affecté | Position GPS (EN_COURS uniquement) |
| GET | `/commandes/:id/suivi` | 🔒 | Trajet GPS, distance parcourue et restante |
| GET | `/notifications` | 🔒 Tous | Les siennes + nombre de non lues |
| PATCH | `/notifications/:id/lue` · `/notifications/lues` | 🔒 Tous | Marquer comme lue(s) |
| PATCH | `/livreurs/moi/disponibilite` · `/livreurs/moi/position` | 🔒 Livreur | Disponibilité, position hors livraison |
| GET / POST | `/admin/utilisateurs` | 🔒 Admin | Liste (filtres, compteurs) / création |
| GET / PATCH / DELETE | `/admin/utilisateurs/:id` | 🔒 Admin | Détail / modification / suppression |
| PATCH | `/admin/utilisateurs/:id/statut` | 🔒 Admin | Valider un livreur, suspendre, réactiver |
| GET | `/admin/clients` · `/admin/livreurs` | 🔒 Admin | Listes avec statistiques |
| GET | `/admin/livraisons/actives` | 🔒 Admin | Livraisons en cours + dernière position |
| PUT | `/admin/tarification` | 🔒 Admin | Modifier la grille tarifaire |

Les KPI, rapports PDF et l'assistant IA arrivent aux phases 12 à 14.

## Format des erreurs

```json
{ "message": "Certaines données sont invalides",
  "details": [{ "champ": "email", "message": "Adresse e-mail invalide" }] }
```

| Code | Cas |
|---|---|
| 400 | Données invalides |
| 401 | Non connecté, jeton invalide ou expiré |
| 403 | Rôle insuffisant, compte suspendu ou en attente |
| 404 | Ressource absente **ou appartenant à un autre utilisateur** (on ne révèle pas son existence) |
| 409 | Règle métier (transition interdite, doublon, livreur indisponible…) |
| 500 | Erreur imprévue : message générique, détail uniquement dans les journaux du serveur |

## Mesures de sécurité

| Mesure | Mise en œuvre |
|---|---|
| Mots de passe | bcrypt (coût 12) ; la base refuse tout mot de passe non haché |
| Authentification | JWT HS256 signé, expiration 8 h, secret de 32 caractères minimum dans `.env` |
| Suspension immédiate | Le compte est relu en base à chaque requête : un jeton émis avant la suspension est refusé |
| Rôles | Middleware `autoriser()` + règles par action dans `commandeService.ACTIONS` |
| Aucun admin public | Le rôle est fixé par la route d'inscription, jamais lu dans le formulaire |
| Cloisonnement | Un client ou un livreur ne voit que ses propres commandes (404 sinon) |
| Montant | Toujours calculé côté serveur ; une valeur envoyée est ignorée |
| Injection SQL | Requêtes paramétrées (`$1, $2…`) exclusivement |
| Attaques par force brute | 20 tentatives / 15 min sur connexion, inscription et mot de passe |
| Énumération de comptes | Même message et même durée de réponse (e-mail inconnu ou mauvais mot de passe) |
| Réinitialisation | Jeton aléatoire de 256 bits, seule son empreinte SHA-256 est stockée, 30 min, usage unique |
| En-têtes HTTP | Helmet ; CORS limité à l'adresse du frontend |
| Défense en profondeur | Même en cas de bug du backend, les triggers PostgreSQL refusent une transition invalide |
