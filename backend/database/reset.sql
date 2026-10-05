-- ATTENTION : supprime toutes les tables et données SmartDelivery.
-- Utilisé uniquement en développement (npm run db:reset).
DROP TABLE IF EXISTS reinitialisations_mot_de_passe, kpis, rapports, conversations_ia,
  notifications, historique_statuts, positions_gps, livraisons, commandes,
  parametres_tarification, zones, administrateurs, livreurs, clients, utilisateurs CASCADE;
DROP SEQUENCE IF EXISTS commande_numero_seq;
DROP FUNCTION IF EXISTS maj_date_modification, transition_autorisee, commande_avant_insertion,
  commande_avant_modification, commande_apres_changement, livraison_avant_insertion,
  livraison_statut_protege, position_avant_insertion, recalculer_note_livreur CASCADE;
DROP TYPE IF EXISTS role_utilisateur, statut_compte, type_vehicule, type_colis, statut_commande,
  statut_livraison, statut_notification, type_rapport CASCADE;
