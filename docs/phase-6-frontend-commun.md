# Phase 6 : frontend commun

## Lancer l'application complète

Deux terminaux :

```bash
# Terminal 1 : API (http://localhost:4000)
cd backend && npm run dev

# Terminal 2 : interface (http://localhost:5173)
cd frontend
npm install
npm run dev
```

En développement, Vite redirige `/api` vers le backend : aucune configuration CORS n'est nécessaire.

## Tests

```bash
cd frontend && npm test      # 16 tests (gardes de routes, connexion, inscription, messages d'erreur)
cd frontend && npm run build # compilation de production dans dist/
```

## Structure

```
frontend/src/
├── api/            client.js (Axios + jeton + fin de session), un fichier par domaine
├── context/        AuthContext (utilisateur connecté), NotificationsContext (compteur)
├── routes/         Gardes.jsx : RouteProtegee (rôles), RoutePublique, RedirectionAccueil
├── layouts/        AuthLayout (écrans d'accès), EspaceLayout (sidebar, en-tête, barre mobile)
├── components/ui/  Bouton, Champ, ChampPhoto, Etats (chargement/erreur/vide), Modale, Logo…
├── config/         rôles, navigation de chaque espace
├── hooks/          useRequete : chargement, succès, erreur
└── pages/          auth/, commun/ (profil, notifications), admin/, client/, livreur/
```

## Authentification côté interface

1. L'utilisateur saisit e-mail et mot de passe : **aucun choix de rôle**.
2. L'API renvoie un jeton JWT ; le rôle est relu dans le compte (`/auth/moi`).
3. Redirection automatique : ADMIN vers `/admin`, CLIENT vers `/client`, LIVREUR vers `/livreur`.
4. « Se souvenir de moi » : le jeton est conservé dans `localStorage` ; sinon dans `sessionStorage` (effacé à la fermeture du navigateur).
5. Si le jeton expire ou si le compte est suspendu, toute requête renvoie 401/403 : la session est fermée et l'utilisateur est renvoyé vers la connexion avec un message.

`RouteProtegee` protège chaque espace : un client qui tape `/admin` est renvoyé vers `/client`. La vraie sécurité reste côté serveur (l'API refuse la requête même si l'interface était contournée).

## Écarts assumés par rapport au prototype

| Prototype | Application | Raison |
|---|---|---|
| Onglet « Administrateur » à l'inscription | Retiré | Décision validée en phase 1 (point 1) |
| Champ « Nom complet » | « Prénom » + « Nom » | Le modèle de données (classe Utilisateur) sépare nom et prénom |
| Photo de personne sur la page de connexion | Illustration vectorielle | Aucune image externe : l'application fonctionne hors ligne. Votre photo peut être placée dans `public/images/` |
| Permis obligatoire | Obligatoire sauf pour un vélo | Un cycliste n'a pas de permis de conduire |
