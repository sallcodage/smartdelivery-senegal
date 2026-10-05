# Splash Screen (écran de démarrage)

## Comportement

```
Ouverture de SmartDelivery
  → Splash Screen (au moins 2,5 s, et jusqu'à la fin de la vérification de session)
  → Session valide   : espace du rôle (CLIENT → /client, LIVREUR → /livreur, ADMIN → /admin)
                       ou la page demandée si l'adresse en contenait une
  → Pas de session   : /connexion (alias /login)
  → Jeton invalide ou expiré : session locale supprimée, /connexion
```

La vérification de session n'a pas changé : c'est celle d'`AuthContext` (appel à `/api/auth/moi` avec le jeton enregistré). Le Splash Screen se contente de la couvrir visuellement. **Aucune modification du système JWT ni des règles métier.**

## Fichiers

| Fichier | Rôle |
|---|---|
| `frontend/src/components/demarrage/SplashScreen.jsx` | Affichage : logo, nom, signature, chargement |
| `frontend/src/components/demarrage/SplashScreen.css` | Styles et animations (fondu et léger zoom, points de chargement) |
| `frontend/src/components/demarrage/Demarrage.jsx` | Logique : durée minimale, attente de la vérification, fondu de sortie |
| `frontend/src/App.jsx` | Intégration autour des routes et alias `/login` |
| `frontend/src/tests/demarrage.test.jsx` | 5 tests unitaires |

## Détails de conception

- **Durée** : 2,5 s à l'ouverture (nouvel onglet ou nouvelle fenêtre). Un rechargement dans le même onglet n'impose pas de nouvelle attente : la vérification reste, sans délai artificiel.
- **Réseau lent** : si l'API répond après 2,5 s, le splash reste affiché jusqu'à la réponse. On ne voit jamais un écran intermédiaire.
- **Transition fluide** : la page d'arrivée se prépare sous le splash. Elle est rendue inaccessible (attribut `inert`, défilement bloqué), puis apparaît instantanément à la sortie.
- **Accessibilité** : `role="status"` avec un libellé lu par les lecteurs d'écran ; animations désactivées si le système demande de réduire les animations ; contrastes conformes WCAG AA.
- **Tests automatisés** : les navigateurs pilotés par des tests (`navigator.webdriver`) ne subissent pas l'attente de 2,5 s.

## Vérifications

- 5 tests unitaires (durée, attente de l'API, rechargement, mémorisation, page inaccessible).
- 13 vérifications dans un vrai navigateur :
  - contenu et plein écran ;
  - durée mesurée (3,2 s depuis l'ouverture de la page, fondu compris) ;
  - aucune session : `/connexion` ;
  - sessions valides Client, Livreur et Admin : leur espace respectif ;
  - lien direct conservé ;
  - jeton invalide : session supprimée ;
  - alias `/login` ;
  - rechargement ;
  - réduction des animations.
