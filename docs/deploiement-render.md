# Déploiement sur Render (offre gratuite)

## Architecture en ligne

```
Navigateur ──HTTPS──► Site statique « smartdelivery-senegal » (React compilé)
                         │  règle de réécriture /api/*  (relais transparent)
                         ▼
                      Service web « smartdelivery-api » (Node.js / Express)
                         │  adresse interne (même région)
                         ▼
                      PostgreSQL « smartdelivery-db »
```

Le site relaie les appels `/api/*` vers l'API. Pour le navigateur, tout vient du **même site** : pas de problème de CORS, les photos s'affichent, et le **HTTPS** permet le GPS des téléphones.

## Limites de l'offre gratuite (documentation Render, octobre 2026)

| Limite | Conséquence |
|---|---|
| L'API s'endort après 15 min sans visite ; réveil en 1 min environ | Ouvrir l'API quelques minutes avant une démonstration |
| Disque effacé à chaque redémarrage ou mise en veille | Photos (profils, permis) et PDF des rapports perdus ; **les données en base restent**. Un rapport perdu peut être régénéré |
| Base gratuite : 1 Go, **expire 30 jours après sa création** (puis 14 jours de grâce avant suppression), sans sauvegarde | Créer la base peu avant la soutenance, ou passer à une offre payante |
| Pas de service d'e-mail | « Mot de passe oublié » indisponible en production |

## Étapes

### 0. Publier la dernière version sur GitHub
```bash
git add -A
git commit -m "Préparation du déploiement Render"
git push
```

### 1. Compte Render
Créer un compte sur https://render.com avec **GitHub**, puis autoriser l'accès au dépôt `smartdelivery-senegal`. Utiliser la **même région** pour les trois services (**Frankfurt**, la plus proche du Sénégal).

### 2. Base PostgreSQL
**New**, puis **Postgres** : Name `smartdelivery-db`, Database `smartdelivery_senegal`, Region Frankfurt, Plan **Free**.
Une fois la base créée, noter l'**Internal Database URL** (pour l'API) et l'**External Database URL** (pour l'initialisation depuis le PC).

### 3. Initialiser la base depuis le PC
Dans un terminal **cmd**, à la racine du projet (la variable ne vaut que pour ce terminal) :
```bat
set DATABASE_URL=EXTERNAL_DATABASE_URL?sslmode=no-verify
set ADMIN_MOT_DE_PASSE=MotDePasseAdminEnLigne2026
npm run db:init
npm run db:admin
npm run db:seed
```
Fermer ensuite ce terminal : les commandes suivantes utiliseront de nouveau la base locale.

### 4. Service web (API)
**New**, puis **Web Service**, puis le dépôt `smartdelivery-senegal` :

| Champ | Valeur |
|---|---|
| Name | `smartdelivery-api` |
| Region | Frankfurt |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path (Advanced) | `/api/sante` |

Variables d'environnement :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `DATABASE_URL` | Internal Database URL (étape 2) |
| `JWT_SECRET` | un **nouveau** secret (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `JWT_EXPIRATION` | `8h` |
| `CORS_ORIGIN` / `FRONTEND_URL` | adresse du site (étape 5), ex. `https://smartdelivery-senegal.onrender.com` |
| `TRUST_PROXY` | `2` |
| `IA_FOURNISSEUR` / `IA_MODELE` | `gemini` / `gemini-3.5-flash` |
| `IA_CLE_API` | clé Gemini (jamais dans le code) |
| `IA_DELAI_MS` | `60000` |

### 5. Site statique (interface)
**New**, puis **Static Site**, puis le même dépôt :

| Champ | Valeur |
|---|---|
| Name | `smartdelivery-senegal` |
| Branch | `main` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Variables d'environnement : `NODE_VERSION=22`, et `VITE_SIMULATION_GPS=true` (bouton « Simuler le trajet » pour les démonstrations).

**Redirects/Rewrites**, dans **cet ordre** :

| Source | Destination | Action |
|---|---|---|
| `/api/*` | `https://smartdelivery-api.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

La première règle relaie l'API. La seconde permet d'ouvrir directement n'importe quelle page de l'application (routage React).

### 6. Finaliser
Reporter l'adresse exacte du site dans `CORS_ORIGIN` et `FRONTEND_URL` de l'API. Render redéploie automatiquement.

### 7. Vérifier
1. `https://smartdelivery-api.onrender.com/api/sante` affiche `{"statut":"ok","base":"connectée"}`.
2. Le site s'ouvre ; connexion avec les comptes de démonstration (mot de passe : `DEMO_MOT_DE_PASSE` du `.env` local au moment du seed).

## Ensuite

- **Mises à jour** : chaque `git push` sur `main` redéploie automatiquement l'API et le site.
- **Avant une démonstration** : ouvrir `/api/sante` 2 minutes avant, pour réveiller l'API.
- **Rester éveillé (facultatif)** : un service de surveillance gratuit (UptimeRobot, par exemple) qui appelle `/api/sante` toutes les 10 minutes. Un seul service web gratuit tourne alors environ 744 h par mois, dans la limite des 750 h offertes.
- **Pour aller plus loin** : offre payante (plus de mise en veille, disque persistant, sauvegardes), stockage des fichiers sur un service dédié (Cloudinary, S3), service d'e-mail pour la réinitialisation des mots de passe.
