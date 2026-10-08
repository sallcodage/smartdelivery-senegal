# Documentation de SmartDelivery Sénégal

Une fiche par phase du projet, à consulter pour préparer les questions du jury.

| Fiche | Contenu |
|---|---|
| [Phase 3 : base de données](phase-3-base-de-donnees.md) | Installation PostgreSQL, modèle entité-relation, règles garanties par la base, codes d'erreur métier |
| [Phases 4 et 5 : API et sécurité](phase-4-5-api-securite.md) | Architecture du backend, toutes les routes, format des erreurs, mesures de sécurité |
| [Phase 6 : frontend commun](phase-6-frontend-commun.md) | Structure de l'interface, authentification côté interface, écarts au prototype |
| [Phase 7 : espace client](phase-7-espace-client.md) | Création de commande sur carte, actions selon le statut |
| [Phase 8 : espace livreur](phase-8-espace-livreur.md) | Parcours du livreur, performances, simulation de trajet |
| [Phase 9 : espace administrateur](phase-9-espace-administrateur.md) | Affectation, gestion des comptes, export CSV, tarification |
| [Phase 10 : géolocalisation](phase-10-geolocalisation.md) | Chaîne d'une position GPS, cartes en temps réel, confidentialité |
| [Phases 11 et 12 : notifications et KPI](phase-11-12-notifications-kpi.md) | Matrice des notifications, définitions des indicateurs |
| [Phase 13 : rapports PDF](phase-13-rapports-pdf.md) | Les trois rapports, KPI figés, sécurité des fichiers |
| [Phase 14 : assistant IA](phase-14-assistant-ia.md) | Gemini, outils, garde-fou, mode secours, sécurité de la clé |
| [Déploiement sur Render](deploiement-render.md) | Mise en ligne : base, API, site, variables, limites de l'offre gratuite |
| [Splash Screen](splash-screen.md) | Écran de démarrage et vérification de session |
| [Données de démonstration (seed)](seed-demonstration.md) | Commandes, comptes de démo, respect du schéma, réexécution contrôlée |
| [Phases 15 à 17 : tests et finitions](phase-15-17-tests-finitions.md) | Parcours complet automatisé, audit responsive et accessibilité, bilan des tests |

Captures d'écran : dossier [captures/](captures/) (connexion, inscription livreur, tableau de bord ordinateur et mobile, statistiques, commandes, rapports, paramètres).
Elles ont été prises avec les données créées par les tests automatisés, dans un environnement sans Internet : remplacez-les par des captures de votre propre démonstration (avec les fonds de carte OpenStreetMap) avant de les intégrer au mémoire.
