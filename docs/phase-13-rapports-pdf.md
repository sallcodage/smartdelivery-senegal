# Phase 13 : rapports PDF

## Fonctionnement

1. L'administrateur choisit un **type** et une **période** (raccourcis ou dates libres, jamais dans le futur).
2. Le serveur calcule les indicateurs sur la période (`kpiService`, mêmes définitions que le tableau de bord).
3. PDFKit écrit le fichier dans `backend/rapports/` (variable `RAPPORTS_DIR`).
4. Dans une transaction : enregistrement du rapport (table `rapports`) et des **KPI figés** (table `kpis`, liée au rapport). Si l'enregistrement échoue, le fichier est supprimé.
5. Le rapport est consultable (aperçu intégré) et téléchargeable à tout moment, même si les données changent ensuite : les KPI figés gardent la photographie du jour de génération.

## Les trois rapports

| Type | Contenu |
|---|---|
| **Activité globale** | 9 indicateurs clés, histogramme des commandes, répartition par statut, zones, types de colis, 10 meilleurs livreurs |
| **Performance des livreurs** | Synthèse (livreurs actifs, taux d'acceptation, temps moyen, note, gains), histogramme des livraisons, tableau détaillé par livreur |
| **Financier** | Chiffre d'affaires, panier moyen, part des livreurs et de la plateforme, montant en attente de confirmation, évolution, répartition par zone et par type de colis, montants annulés |

Chaque rapport se termine par la **méthode de calcul** des indicateurs, utile devant le jury. Les pages sont numérotées.

## API (administrateur)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/admin/rapports` | `{ type, periodeDebut, periodeFin }` (AAAA-MM-JJ) → rapport créé + KPI figés |
| GET | `/api/admin/rapports?type=&page=` | Liste, du plus récent au plus ancien |
| GET | `/api/admin/rapports/:id` | Détail + KPI figés |
| GET | `/api/admin/rapports/:id/pdf` | Le PDF (`?telecharger=1` pour forcer le téléchargement) |

Sécurité : routes réservées à l'administrateur, fichiers servis uniquement par l'API (aucun lien public), et en-tête `Cache-Control: private, no-store` pour qu'un rapport financier ne reste pas dans le cache d'un ordinateur partagé.

## Tests

- Backend : 69 tests, dont 6 sur les rapports. Le **texte des PDF est relu** (pdf-parse) : titre, période, numérotation, chiffre d'affaires imprimé égal au KPI calculé, livreur présent dans le rapport de performance, période sans activité.
- Navigateur : 9 vérifications (validation des dates, génération, aperçu, indicateurs figés, téléchargement, liste, filtre, consultation).

Le contrôle visuel des pages a été fait en convertissant les PDF en images (`pdftoppm`).
