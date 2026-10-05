# Phase 14 : Assistant IA (Google Gemini)

## Mise en route avec Gemini (démo)

1. Créer une clé sur **Google AI Studio** : https://aistudio.google.com/apikey
2. Dans `backend/.env` (jamais versionné, déjà listé dans `.gitignore`) :
   ```
   IA_FOURNISSEUR=gemini
   IA_MODELE=gemini-3.5-flash
   IA_CLE_API=votre_cle
   ```
3. Vérifier la configuration :
   ```bash
   cd backend && npm run ia:test
   ```
   Le script affiche le fournisseur, le modèle et « Clé API : définie (n caractères) », sans jamais afficher la clé, puis la réponse de Gemini ou l'erreur précise.
4. Redémarrer l'API (`npm run dev`).

**Changer de fournisseur** : `IA_FOURNISSEUR=openai` ou `anthropic` + `IA_MODELE` + `IA_CLE_API`, puis redémarrer. Aucune autre modification : la logique de l'assistant ne dépend pas du fournisseur. `IA_FOURNISSEUR=aucun` désactive l'IA (mode secours seul).

## Architecture

```
Client ─► POST /api/assistant/questions
            │
            ▼
   assistantService ──► adaptateur (gemini | openai | anthropic)   ← choisi par .env
            │                 │  l'IA demande des données…
            │                 ▼
            │           outils.js  (exécutés par le backend, pour CE client uniquement)
            │             • consulter_commande   • lister_mes_commandes
            │             • estimer_tarif (formule officielle du backend)
            │             • informations_service (zones, tarifs, règles)
            ▼
   verification.js  (garde-fou)  ──échec──►  secours.js (réponse construite depuis la base)
            │
            ▼
   conversations_ia (question, réponse, fournisseur, modèle, commande consultée)
```

| Fichier | Rôle |
|---|---|
| `services/ia/configuration.js` | Lecture de `.env` (fournisseur, modèle, clé, délai) |
| `services/ia/fournisseurs/*.js` | Un adaptateur par fournisseur, même interface `converser()` |
| `services/ia/outils.js` | Seul accès de l'IA aux données, filtré sur le client connecté |
| `services/ia/consigne.js` | Instructions données au modèle |
| `services/ia/verification.js` | Garde-fou contre les informations inventées |
| `services/ia/secours.js` | Réponses fiables sans IA |
| `services/assistantService.js` | Orchestration, mémoire (6 derniers échanges), enregistrement |

## Garanties contre les informations inventées (« hallucinations »)

| Risque | Protection |
|---|---|
| Statut, livreur, position inventés | L'IA n'obtient ces informations **que** par les outils, qui lisent PostgreSQL |
| Commande d'un autre client | L'outil répond « introuvable » sans rien révéler (même message que pour un numéro inexistant) |
| Prix ou délai calculé « de tête » | `estimer_tarif` applique la formule du backend (la même que pour les vraies commandes) |
| Coordonnées GPS | Jamais transmises à l'IA : seulement la distance restante et l'ancienneté de la position |
| Réponse qui cite malgré tout un chiffre faux | **Garde-fou** : chaque numéro de commande, montant en FCFA et durée en minutes cités doit figurer dans les données renvoyées par les outils (ou dans la question). Sinon la réponse est rejetée et remplacée par une réponse construite depuis la base |
| Information absente de la base | Consigne + outils explicites (`trouve: false`, `possible: false`) : l'assistant dit qu'il ne dispose pas de l'information |

Le garde-fou est volontairement strict : si Gemini arrondit un délai (« 10 min » au lieu de 11), la réponse est remplacée. Mieux vaut une réponse sobre qu'une réponse fausse.

## Indisponibilité de Gemini

Clé absente ou refusée, quota atteint (429), panne (5xx), réseau coupé, délai dépassé (`IA_DELAI_MS`, 20 s par défaut) ou réponse bloquée : le client obtient quand même une **réponse exacte construite depuis la base** (suivi de commande, tarifs, zones, annulation), avec un avertissement visible. L'échange est enregistré avec `fournisseur = 'secours'`. L'écran affiche l'état de l'IA (connectée ou mode simplifié).

## Sécurité de la clé

- Uniquement dans `backend/.env` (ignoré par Git) ; `.env.example` contient `IA_CLE_API=` vide.
- Envoyée à Google dans l'en-tête `x-goog-api-key`, jamais dans l'URL.
- Jamais journalisée, jamais enregistrée en base, jamais renvoyée au navigateur (l'interface ne parle qu'au backend).
- Un test automatique parcourt le code source pour vérifier qu'aucune clé (formats Google, OpenAI, Anthropic) n'y figure.

## Tests

- Backend (17 tests, API Gemini **simulée** au format officiel) : réponse simple, appel d'outil avec renvoi de la signature de réflexion, cloisonnement entre clients, estimation par la formule du backend (adresses et distance), garde-fou (prix et numéro inventés), 6 types de panne, absence de clé, historique et mémoire, rôles, adaptateurs OpenAI et Anthropic, absence de clé dans le code.
- Navigateur avec un faux serveur Gemini local (8 vérifications) : suggestions, réponse avec données réelles, garde-fou, panne, historique, mobile.

**À faire de votre côté** : l'environnement de développement utilisé n'avait pas accès à Internet. Le comportement avec le vrai Gemini doit être confirmé avec votre clé : `npm run ia:test`, puis quelques questions dans l'application.
