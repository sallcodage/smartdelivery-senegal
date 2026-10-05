# SmartDelivery Sénégal

**Conception et développement d'une plateforme intelligente d'analyse de performance et d'optimisation des services de livraison au Sénégal.**

Application web complète qui réunit trois acteurs :

- le **client**, qui commande une livraison, la suit en direct sur une carte et dialogue avec un assistant IA ;
- le **livreur**, qui accepte ses livraisons et partage sa position GPS ;
- l'**administrateur**, qui valide, affecte, supervise et analyse la performance du service (KPI, statistiques, rapports PDF).

Toutes les données affichées proviennent de PostgreSQL : l'application ne contient aucune donnée fictive.

![Tableau de bord administrateur](docs/captures/tableau-de-bord.png)

---

## Sommaire

1. [Fonctionnalités](#1-fonctionnalités)
2. [Architecture et technologies](#2-architecture-et-technologies)
3. [Installation](#3-installation)
4. [Configuration (.env)](#4-configuration-env)
5. [Lancement et premier administrateur](#5-lancement-et-premier-administrateur)
6. [Comptes de test](#6-comptes-de-test)
7. [Parcours d'une commande](#7-parcours-dune-commande)
8. [Procédure de démonstration (soutenance)](#8-procédure-de-démonstration-soutenance)
9. [Tests](#9-tests)
10. [Structure des dossiers](#10-structure-des-dossiers)
11. [API REST](#11-api-rest)
12. [Sécurité](#12-sécurité)
13. [Indicateurs de performance (KPI)](#13-indicateurs-de-performance-kpi)
14. [Assistant IA](#14-assistant-ia)
15. [Dépannage](#15-dépannage)
16. [Choix techniques, écarts et limites](#16-choix-techniques-écarts-et-limites)

---

## 1. Fonctionnalités

| Client | Livreur | Administrateur |
|---|---|---|
| Inscription, connexion, profil (photo) | Inscription avec permis, validée par l'admin | Tableau de bord : 8 KPI, graphiques, top livreurs, mini-carte |
| Nouvelle commande sur carte OpenStreetMap, prix calculé automatiquement | Disponibilité (en ligne / hors ligne) | Commandes : validation, affectation manuelle ou automatique (au plus proche), annulation, export CSV |
| Mes commandes (filtres, recherche), détail, modification et annulation tant que « En attente » | Livraisons affectées : accepter ou refuser (motif obligatoire) | Carte des livraisons en temps réel |
| **Suivi GPS en direct** du livreur, distance et durée restantes | Démarrer, navigation GPS, terminer | Utilisateurs, livreurs (documents, validation), clients |
| Confirmation de réception et note du livreur | Partage automatique de la position | Statistiques : revenus, types de colis, zones, évolution |
| **Assistant IA** (Gemini) fondé sur les données réelles | Historique et performances (graphiques) | **Rapports PDF** (activité, livreurs, financier) |
| Notifications à chaque étape | Notifications | Paramètres de tarification (avec aperçu), notifications |

Interface responsive (téléphone, tablette, ordinateur), fidèle au prototype et conforme aux règles d'accessibilité WCAG 2.1 AA (contrôle automatique de 105 affichages).

## 2. Architecture et technologies

```
┌──────────────────────────┐   HTTPS / JSON    ┌───────────────────────────────┐   SQL   ┌──────────────┐
│ Frontend React (Vite)    │ ────────────────► │ API Node.js / Express         │ ──────► │ PostgreSQL   │
│ React Router, Leaflet,   │   JWT (en-tête)   │ routes → middlewares (JWT,     │         │ 15 tables,   │
│ OpenStreetMap, Recharts, │                   │ rôles, validation) → contrô-  │         │ triggers     │
│ Tailwind CSS             │                   │ leurs → services              │         │ métier       │
└──────────────────────────┘                   └──────────────┬────────────────┘         └──────────────┘
                                                              │ API REST (clé dans .env)
                                                              ▼
                                                   Google Gemini (assistant IA)
```

| Couche | Technologies |
|---|---|
| Frontend | React 19, Vite, React Router, Axios, React Leaflet + OpenStreetMap, Recharts, Tailwind CSS, Lucide |
| Backend | Node.js (≥ 20), Express 5, pg, express-validator, Helmet, CORS, express-rate-limit, Multer |
| Sécurité | bcrypt, JWT (jsonwebtoken), contrôle d'accès par rôle |
| Base de données | PostgreSQL ≥ 13 (contraintes, clés étrangères, triggers de règles métier) |
| Rapports | PDFKit |
| IA | Google Gemini (API REST), adaptateurs OpenAI et Anthropic interchangeables |
| Tests | Jest + Supertest (API), Vitest + Testing Library (interface), Puppeteer + axe-core (bout en bout, accessibilité) |

## 3. Installation

### Prérequis

- **Node.js 20 ou plus** : https://nodejs.org (version LTS)
- **PostgreSQL 13 ou plus** : https://www.postgresql.org/download/
  - Windows : l'installateur inclut **pgAdmin** ; retenez le mot de passe de l'utilisateur `postgres`.
  - macOS : `brew install postgresql@16 && brew services start postgresql@16`
  - Ubuntu : `sudo apt install postgresql`
- Une connexion Internet pour les fonds de carte OpenStreetMap, la recherche d'adresses et l'assistant IA (le reste fonctionne hors ligne).

### Étape 1 : créer la base de données

Dans pgAdmin (outil « Query Tool ») ou dans `psql -U postgres` :

```sql
CREATE ROLE smartdelivery LOGIN PASSWORD 'choisissez_un_mot_de_passe';
CREATE DATABASE smartdelivery OWNER smartdelivery;
```

### Étape 2 : installer les dépendances

Depuis le dossier du projet :

```bash
npm run installer
```

(équivaut à `npm install` à la racine, dans `backend/` puis dans `frontend/`)

## 4. Configuration (.env)

```bash
cp backend/.env.example backend/.env     # Windows : copy backend\.env.example backend\.env
```

Puis compléter `backend/.env` :

| Variable | Rôle | Exemple |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | `postgresql://smartdelivery:MOT_DE_PASSE@localhost:5432/smartdelivery` |
| `JWT_SECRET` | Secret de signature des jetons (≥ 32 caractères) | générer avec `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRATION` | Durée de session | `8h` |
| `CORS_ORIGIN`, `FRONTEND_URL` | Adresse de l'interface | `http://localhost:5173` |
| `ADMIN_*` | Premier administrateur (étape 5), à effacer ensuite | |
| `IA_FOURNISSEUR` | `gemini`, `openai`, `anthropic` ou `aucun` | `gemini` |
| `IA_MODELE` | Modèle d'IA | `gemini-3.5-flash` |
| `IA_CLE_API` | Clé de l'API d'IA ([Google AI Studio](https://aistudio.google.com/apikey)) | |
| `UPLOADS_DIR`, `RAPPORTS_DIR` | Dossiers des photos et des PDF | `uploads`, `rapports` |

> **Les fichiers `.env` ne doivent jamais être publiés** : ils sont exclus par `.gitignore`. Seuls les fichiers `.env.example` (sans valeurs secrètes) sont versionnés.

Le frontend n'a besoin d'aucune configuration en développement (Vite redirige `/api` vers le backend).

## 5. Lancement et premier administrateur

```bash
npm run db:init       # crée les tables, contraintes, triggers, zones et paramètres de tarification
npm run db:admin      # crée le premier administrateur à partir de ADMIN_* (puis retirez ADMIN_MOT_DE_PASSE du .env)
npm run ia:test       # (facultatif) vérifie la connexion à Gemini
npm run dev           # démarre l'API (http://localhost:4000) et l'interface (http://localhost:5173)
```

Ouvrir **http://localhost:5173**.

Aucun administrateur ne peut être créé par le formulaire public : le premier l'est par `db:admin`, les suivants depuis l'espace administrateur.

## 6. Comptes de test

### Données de démonstration (recommandé pour la soutenance)

```bash
npm run db:seed
```

Cette commande crée en 30 secondes environ **642 commandes sur 90 jours**, 61 clients, 19 livreurs, environ 7 300 positions GPS, les notifications, des conversations avec l'assistant et 3 rapports PDF. Les données sont **fictives** et respectent toutes les règles de la base. Trois comptes sont prêts à l'emploi :

| Rôle | E-mail |
|---|---|
| Administrateur | `admin.demo@demo.smartdelivery.sn` |
| Client | `client.demo@demo.smartdelivery.sn` |
| Livreur | `livreur.demo@demo.smartdelivery.sn` |

Le mot de passe est celui défini dans `DEMO_MOT_DE_PASSE` (`backend/.env`), ou généré et affiché une seule fois. Pour rafraîchir les dates la veille de la soutenance : `npm run db:seed -- --remplacer`. Détails : [docs/seed-demonstration.md](docs/seed-demonstration.md).

### Comptes créés à la main

| Rôle | Création |
|---|---|
| Administrateur | `npm run db:admin` |
| Client | Formulaire « Créer un compte », puis Client |
| Livreur | Formulaire « Créer un compte », puis Livreur (avec photo de permis), puis **validation** par l'admin (Livreurs, À valider) |

## 7. Parcours d'une commande

```mermaid
stateDiagram-v2
  [*] --> NOUVELLE : le client commande
  NOUVELLE --> VALIDEE : l'admin valide
  NOUVELLE --> ANNULEE : client ou admin
  VALIDEE --> LIVREUR_AFFECTE : l'admin affecte un livreur disponible
  VALIDEE --> ANNULEE : admin
  LIVREUR_AFFECTE --> ACCEPTEE : le livreur accepte
  LIVREUR_AFFECTE --> VALIDEE : le livreur refuse (motif), réaffectation
  LIVREUR_AFFECTE --> ANNULEE : admin
  ACCEPTEE --> EN_COURS : le livreur démarre (GPS partagé)
  EN_COURS --> LIVREE : le livreur termine
  LIVREE --> CONFIRMEE : le client confirme (et note)
  CONFIRMEE --> [*]
  ANNULEE --> [*]
```

| Statut | Libellé affiché | Qui agit ensuite |
|---|---|---|
| NOUVELLE | En attente | Admin (valider) ou client (modifier, annuler) |
| VALIDEE | Validée | Admin (affecter) |
| LIVREUR_AFFECTE | Affectée | Livreur (accepter / refuser) |
| ACCEPTEE | Acceptée | Livreur (démarrer) |
| EN_COURS | En cours | Livreur (position GPS, terminer) ; client (suivi en direct) |
| LIVREE | Livrée | Client (confirmer) |
| CONFIRMEE | Terminée | — |
| ANNULEE | Annulée | — |

Chaque transition est contrôlée **deux fois** : par le backend (qui a le droit d'agir, dans quel statut) et par **PostgreSQL** (trigger : graphe des transitions autorisées). Chaque changement est historisé avec son auteur et génère les notifications correspondantes.

## 8. Procédure de démonstration (soutenance)

**Préparation** (la veille) : base initialisée, un administrateur, un client et un livreur validé ; quelques jours d'utilisation réelle pour que les graphiques aient du relief ; `npm run ia:test` réussi ; connexion Internet (partage de connexion du téléphone si besoin).

Ouvrir **trois fenêtres** (une fenêtre privée par rôle) : client, administrateur, livreur.

| Durée | Étape | Ce que le jury voit |
|---|---|---|
| 1 min | Connexion des 3 comptes | Même formulaire, redirection automatique selon le rôle (venu de la base) ; un client qui tape `/admin` est renvoyé |
| 2 min | **Client** : Nouvelle commande | Points A et B sur la carte, prix calculé par le serveur ; commande « En attente » |
| 2 min | **Admin** : Commandes → À valider | Validation, puis affectation au livreur le plus proche (distance affichée) ; notifications |
| 3 min | **Livreur** : accepter, démarrer, « Simuler le trajet (démonstration) » | Le livreur avance ; **côté client, la carte de suivi bouge en direct** ; côté admin, carte des livraisons |
| 1 min | **Livreur** : terminer ; **Client** : confirmer et noter | Statut « Terminée », historique complet des 7 statuts |
| 2 min | **Admin** : Tableau de bord, Statistiques, Rapports | KPI mis à jour, génération d'un rapport PDF |
| 1 min | **Client** : Assistant IA | « Où est ma commande CMD-… ? » : réponse fondée sur les vraies données |

**Variante automatique** : `npm run parcours:visible --prefix e2e` déroule toute la démonstration seule, avec les trois fenêtres (voir [Tests](#9-tests)).

Questions fréquentes du jury : voir [docs/](docs/) (une fiche par phase : règles métier, sécurité, KPI, IA).

## 9. Tests

| Commande | Contenu | Résultat |
|---|---|---|
| `npm test --prefix backend` | 86 tests d'API (Jest + Supertest) sur une **base de test séparée** : authentification, rôles, cycle complet, GPS, notifications, KPI, rapports PDF (texte relu), assistant IA (Gemini simulé), sécurité de la clé | 86 / 86 |
| `npm run test:db --prefix backend` | 32 vérifications des contraintes et triggers PostgreSQL | 32 / 32 |
| `npm test --prefix frontend` | 18 tests d'interface (gardes de routes, formulaires, fenêtres) | 18 / 18 |
| `npm run lint` | ESLint (0 erreur, 0 avertissement) | ✔ |
| `npm run parcours --prefix e2e` | **Parcours complet par l'interface**, 3 utilisateurs, vrai navigateur | 26 vérifications |
| `npm run responsive --prefix e2e` | 35 écrans × 3 largeurs : débordements + accessibilité (axe-core) | 0 défaut |

**Base de test** : créer `smartdelivery_test` (même procédure que l'étape 1), puis `cp backend/.env.test.example backend/.env.test` et le compléter. Cette base est **entièrement effacée** à chaque lancement (son nom doit contenir « test »).

**Tests de bout en bout** : API et interface démarrées, puis :

```bash
cd e2e
npm install                                   # télécharge un Chrome de test (Puppeteer)
cp .env.example .env                          # renseigner E2E_ADMIN_EMAIL et E2E_ADMIN_MOT_DE_PASSE
node --env-file=.env parcours-complet.mjs     # ajouter --visible pour voir les 3 fenêtres
node --env-file=.env responsive.mjs
```

## 10. Structure des dossiers

```
smartdelivery/
├── package.json              commandes globales (installer, dev, test…)
├── backend/
│   ├── database/             schema.sql (tables, contraintes, triggers), reference.sql, reset.sql
│   ├── scripts/              db-init, create-admin, test-db, test-ia
│   ├── src/
│   │   ├── app.js, server.js
│   │   ├── config/           .env, PostgreSQL (pool, transactions)
│   │   ├── routes/           une route par domaine (auth, commandes, admin, assistant…)
│   │   ├── middleware/       authentifier (JWT), autoriser (rôle), valider, limiteur, téléversement, erreurs
│   │   ├── validators/       règles de validation des entrées
│   │   ├── controllers/      lecture de la requête, réponse HTTP
│   │   ├── services/         logique métier et SQL (commandeService = cycle de vie)
│   │   │   └── ia/           configuration, adaptateurs (gemini, openai, anthropic), outils, garde-fou, secours
│   │   └── utils/            géolocalisation, PDF, pagination, constantes
│   └── tests/                tests d'API et de base de données
├── frontend/
│   └── src/
│       ├── api/              un fichier par domaine + client Axios (jeton, fin de session)
│       ├── context/          authentification, notifications, position du livreur
│       ├── routes/           gardes (RouteProtegee, RoutePublique)
│       ├── layouts/          écrans d'accès, espaces (sidebar, barre mobile)
│       ├── components/       ui, carte, commandes, livraisons, admin, statistiques
│       ├── pages/            auth, commun, client, livreur, admin
│       └── tests/
├── e2e/                      parcours complet et audit responsive / accessibilité
└── docs/                     une fiche par phase (analyse, API, sécurité, KPI, IA…)
```

## 11. API REST

Préfixe `/api`, réponses JSON, erreurs au format `{ "message", "details" }`. Détail complet : [docs/phase-4-5-api-securite.md](docs/phase-4-5-api-securite.md).

| Domaine | Principales routes | Rôles |
|---|---|---|
| Authentification | `POST /auth/inscription/client`, `/auth/inscription/livreur`, `/auth/connexion`, `/auth/mot-de-passe-oublie`, `GET /auth/moi` | Public / connecté |
| Profil | `GET·PATCH /profil`, `PUT /profil/photo`, `PATCH /profil/mot-de-passe` | Tous |
| Commandes | `GET·POST /commandes`, `GET·PATCH /commandes/:id`, `POST /commandes/:id/{valider, affecter, accepter, refuser, demarrer, terminer, confirmer, annuler}` | Selon l'action |
| GPS | `POST /commandes/:id/positions`, `GET /commandes/:id/suivi`, `PATCH /livreurs/moi/position` | Livreur / client concerné / admin |
| Livreur | `PATCH /livreurs/moi/disponibilite`, `GET /livreurs/moi/performances` | Livreur |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/lue`, `PATCH /notifications/lues` | Tous |
| Assistant IA | `POST /assistant/questions`, `GET /assistant/historique`, `GET /assistant/etat` | Client |
| Administration | `/admin/utilisateurs`, `/admin/clients`, `/admin/livreurs`, `/admin/livraisons/actives`, `/admin/commandes/export`, `/admin/kpi`, `/admin/rapports`, `/admin/tarification` | Admin |

## 12. Sécurité

- Mots de passe **hachés avec bcrypt** (coût 12) ; la base refuse tout mot de passe non haché.
- **JWT** signé (HS256, expiration 8 h) ; le compte est relu à chaque requête : une **suspension prend effet immédiatement**.
- **Rôle issu de la base**, jamais choisi à la connexion ; aucune inscription publique d'administrateur.
- Contrôle d'accès à deux niveaux : rôle (middleware) et propriété (un client ne voit que ses commandes, un livreur que ses livraisons ; réponse 404 sinon).
- Validation de toutes les entrées ; requêtes SQL **paramétrées** (pas d'injection SQL).
- Limitation des tentatives échouées (connexion, inscription, mot de passe) et des questions à l'assistant.
- Photos vérifiées par leur contenu réel (pas seulement l'extension) ; documents des livreurs servis uniquement à l'admin et au livreur concerné.
- Rapports PDF sans lien public ni mise en cache.
- Secrets uniquement dans `.env` ; un test vérifie qu'aucune clé d'API n'est présente dans le code.

## 13. Indicateurs de performance (KPI)

| KPI (cahier des charges) | Définition |
|---|---|
| Nombre de livraisons | Commandes livrées ou confirmées |
| Taux de réussite | Livrées ÷ (livrées + annulées **après** validation) |
| Temps de livraison | Moyenne (fin − démarrage) ; délai total (commande → livraison) également affiché |
| Performance des livreurs | Livraisons, taux d'acceptation, temps moyen, distance (GPS), note, gains |
| Chiffre d'affaires | Somme des commandes confirmées |

Calculés en SQL sur les données réelles (`backend/src/services/kpiService.js`). Les rapports PDF figent ces valeurs dans la table `kpis` à la date de génération.

**Tarification** (paramètres modifiables par l'admin, formule unique dans `tarifService.js`) : `montant = max(minimum, arrondi supérieur de (prix de base + distance × prix par km))`. Valeurs initiales : 500 FCFA + 150 FCFA/km, minimum 1 000 FCFA, arrondi 50 FCFA, 80 % reversés au livreur.

## 14. Assistant IA

L'assistant (Gemini) n'accède aux données qu'au travers de **4 outils exécutés par le backend**, limités au client connecté : consulter une commande, lister ses commandes, estimer un tarif (formule officielle), informations sur le service. Un **garde-fou** rejette toute réponse qui citerait un numéro de commande, un montant ou un délai absent des données réelles ; elle est alors remplacée par une réponse construite depuis la base. Si Gemini est indisponible, l'assistant répond quand même en **mode secours**.

Changer de fournisseur : modifier `IA_FOURNISSEUR`, `IA_MODELE` et `IA_CLE_API` dans `backend/.env`. Détails : [docs/phase-14-assistant-ia.md](docs/phase-14-assistant-ia.md).

## 15. Dépannage

| Symptôme | Solution |
|---|---|
| `Connexion PostgreSQL impossible` | PostgreSQL démarré ? `DATABASE_URL` correct (utilisateur, mot de passe, nom de base) ? |
| `Variable d'environnement manquante : JWT_SECRET` | Compléter `backend/.env` (voir section 4) |
| `Le schéma existe déjà` | La base est déjà initialisée ; `npm run db:reset --prefix backend` la recrée (**efface tout**) |
| Carte grise | Pas d'accès Internet : les tuiles OpenStreetMap ne se chargent pas (le placement par clic fonctionne quand même) |
| Adresse remplie avec « Point GPS … » | Recherche d'adresses indisponible ; l'adresse reste modifiable à la main |
| La position du livreur ne s'envoie pas sur téléphone | Le navigateur exige **HTTPS** (ou `localhost`) pour la géolocalisation et l'autorisation de l'utilisateur ; en démonstration, utiliser « Simuler le trajet » |
| Assistant en « mode simplifié » | `npm run ia:test` affiche la cause : clé absente ou refusée, quota, modèle inconnu, réseau |
| `Trop de tentatives` | Limite anti-force brute : patienter 15 minutes (seuls les échecs sont comptés) |
| Port 4000 ou 5173 occupé | Fermer l'autre application ou changer `PORT` (backend) |

## 16. Choix techniques, écarts et limites

**Écarts assumés par rapport au cahier des charges** (décisions validées en phase 1) :

- Analyse des données et assistant **en Node.js** plutôt qu'en Python (diagramme de composant) : une seule technologie côté serveur, KPI calculés directement en SQL ; l'IA est appelée par API.
- Aucune inscription publique d'administrateur (le diagramme d'activité proposait le choix du profil « Admin »).
- Champs ajoutés au modèle de données, chacun justifié : positions GPS, historique des statuts, zones, paramètres de tarification, réinitialisation du mot de passe, type et poids du colis, note du client.
- Vert principal légèrement assombri (`#12873d`) par rapport au prototype pour atteindre le contraste exigé par WCAG 2.1 AA.

**Limites et perspectives** :

- Distances à vol d'oiseau (formule de Haversine) et durée estimée à 20 km/h : un service d'itinéraire routier (OSRM, par exemple) donnerait des valeurs plus précises.
- Suivi par actualisation périodique (5 à 10 s) plutôt que par WebSocket : simple et robuste, suffisant pour une flotte de taille moyenne.
- Pas d'envoi d'e-mails (le lien de réinitialisation est affiché en mode démonstration) ni de paiement en ligne (Wave, Orange Money) : hors périmètre du cahier des charges.
- Recherche d'adresses via le service public Nominatim : une mise en production nécessiterait un service dédié.

---

Projet de soutenance — Technicien supérieur, ISEP de Diamniadio (Sénégal).
