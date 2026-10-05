# Phases 15 à 17 : tests de bout en bout, finitions, documentation

## Parcours complet automatisé (`e2e/parcours-complet.mjs`)

Reproduit, **uniquement par l'interface** et avec trois navigateurs (client, administrateur, livreur), le parcours demandé :

1. Inscription d'un client → compte enregistré dans PostgreSQL.
2. Connexion → JWT → rôle lu en base → redirection vers `/client` ; accès à `/admin` refusé.
3. Inscription d'un livreur avec photo du permis → validation du compte par l'administrateur → livreur disponible, position partagée.
4. Le client crée une commande sur la carte (prix calculé par le serveur).
5. L'administrateur la voit dans « À valider », la valide, sélectionne le livreur et l'affecte.
6. Le livreur voit la livraison, l'accepte, la démarre ; son GPS se déplace (Médina, Fann, Mermoz, Ouakam).
7. Le client suit le livreur sur la carte en direct.
8. Le livreur termine ; le client confirme la réception et note 5/5 → **CONFIRMEE**, historique des 7 statuts.
9. KPI (livraisons +1, chiffre d'affaires +montant), tableau de bord, notifications du client, performances du livreur.
10. Rapport PDF, question à l'assistant IA (réponse fondée sur la commande réelle), annulation d'une commande « En attente ».

Résultat : **26 vérifications en environ 70 secondes, 0 erreur JavaScript**. Option `--visible` : les trois fenêtres s'ouvrent et la démonstration se déroule à l'écran.

## Audit responsive et accessibilité (`e2e/responsive.mjs`)

35 écrans (pages publiques, client, livreur, administrateur, y compris les fiches de détail) × 3 largeurs (375, 768, 1280 px) = **105 affichages**.

| Contrôle | Défauts trouvés au premier passage | Après corrections |
|---|---|---|
| Débordement horizontal | 2 (grilles élargies par un e-mail long) | 0 |
| Contraste des textes (WCAG 2.1 AA, 4,5:1) | 70 écrans (vert des boutons à 3,29:1, gris clairs) | 0 |
| Épingles de carte sans nom accessible | 14 écrans | 0 |
| Champ sans libellé (photo du profil) | 6 écrans | 0 |
| Zones défilantes inaccessibles au clavier | 2 écrans | 0 |

## Optimisations

- Chargement à la demande des écrans (`React.lazy`) : la page de connexion se charge seule ; cartes et graphiques ne sont téléchargés qu'à l'ouverture des écrans qui les utilisent.
- ESLint (règles React et hooks) : 0 erreur, 0 avertissement.

## Bilan des tests

| Suite | Nombre |
|---|---|
| API (Jest + Supertest) | 86 |
| Base de données (contraintes et triggers) | 32 |
| Interface (Vitest) | 18 |
| Navigateur : parcours complet | 26 |
| Navigateur : scénarios détaillés par espace (accès, client, livreur, admin, GPS, KPI, rapports, assistant) | 122 |
| Audit responsive et accessibilité | 105 affichages |
