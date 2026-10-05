-- =====================================================================
--  Tests de la base SmartDelivery. Tout est annulé à la fin (ROLLBACK).
--  Lancer : npm run test:db
-- =====================================================================
BEGIN;

-- Outils de test --------------------------------------------------------
CREATE FUNCTION pg_temp.doit_echouer(requete text, code_attendu text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE requete;
  EXCEPTION WHEN OTHERS THEN
    IF code_attendu IS NOT NULL AND SQLSTATE <> code_attendu THEN
      RAISE EXCEPTION 'Rejet avec un code inattendu (% au lieu de %) : %', SQLSTATE, code_attendu, SQLERRM;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'Cette requête aurait dû être rejetée : %', requete;
END $$;

CREATE FUNCTION pg_temp.verifier(condition boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS NOT TRUE THEN RAISE EXCEPTION 'Vérification échouée : %', message; END IF;
  RAISE NOTICE 'OK %', message;
END $$;

-- Jeu de données temporaire --------------------------------------------
-- 0a = admin, c1 = client, d1 = livreur disponible, d2 = livreur indisponible
INSERT INTO utilisateurs (id, nom, prenom, email, mot_de_passe, telephone, role) VALUES
 ('00000000-0000-0000-0000-00000000000a','Test','Admin',   'admin.test@sd.sn',   rpad('$2b$12$',60,'x'),'770000001','ADMIN'),
 ('00000000-0000-0000-0000-0000000000c1','Test','Client',  'client.test@sd.sn',  rpad('$2b$12$',60,'x'),'770000002','CLIENT'),
 ('00000000-0000-0000-0000-0000000000d1','Test','Livreur1','livreur1.test@sd.sn',rpad('$2b$12$',60,'x'),'770000003','LIVREUR'),
 ('00000000-0000-0000-0000-0000000000d2','Test','Livreur2','livreur2.test@sd.sn',rpad('$2b$12$',60,'x'),'770000004','LIVREUR');
INSERT INTO administrateurs (id) VALUES ('00000000-0000-0000-0000-00000000000a');
INSERT INTO clients (id, adresse) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Sacré-Cœur 3, Dakar');
INSERT INTO livreurs (id, vehicule, disponibilite) VALUES
 ('00000000-0000-0000-0000-0000000000d1','MOTO', true),
 ('00000000-0000-0000-0000-0000000000d2','MOTO', false);

-- 1. Utilisateurs ---------------------------------------------------------
SELECT pg_temp.doit_echouer($q$INSERT INTO utilisateurs (nom,prenom,email,mot_de_passe,telephone,role)
  VALUES ('X','Y','client.test@sd.sn',rpad('$2b$12$',60,'x'),'770000099','CLIENT')$q$, '23505');
SELECT pg_temp.verifier(true, 'E-mail en double refusé');

SELECT pg_temp.doit_echouer($q$INSERT INTO utilisateurs (nom,prenom,email,mot_de_passe,telephone,role)
  VALUES ('X','Y','Majuscule@sd.sn',rpad('$2b$12$',60,'x'),'770000098','CLIENT')$q$, '23514');
SELECT pg_temp.verifier(true, 'E-mail non normalisé (majuscules) refusé');

SELECT pg_temp.doit_echouer($q$INSERT INTO utilisateurs (nom,prenom,email,mot_de_passe,telephone,role)
  VALUES ('X','Y','clair@sd.sn',rpad('motdepasse',60,'x'),'770000097','CLIENT')$q$, '23514');
SELECT pg_temp.verifier(true, 'Mot de passe non haché (bcrypt) refusé');

SELECT pg_temp.doit_echouer($q$INSERT INTO clients (id, adresse)
  VALUES ('00000000-0000-0000-0000-0000000000d1','Pikine')$q$, '23503');
SELECT pg_temp.verifier(true, 'Un compte LIVREUR ne peut pas devenir client (héritage contrôlé)');

-- 2. Création de commande -----------------------------------------------
SELECT pg_temp.doit_echouer($q$INSERT INTO commandes (client_id, adresse_depart, latitude_depart, longitude_depart,
  adresse_arrivee, latitude_arrivee, longitude_arrivee, zone_id, type_colis, poids_kg, distance_km, montant, statut)
  VALUES ('00000000-0000-0000-0000-0000000000c1','Plateau',14.6708,-17.4381,'Almadies',14.7453,-17.5134,
  (SELECT id FROM zones WHERE nom='Dakar'),'PRODUITS',2,11.3,2250,'LIVREE')$q$, 'SD001');
SELECT pg_temp.verifier(true, 'Commande créée directement « LIVREE » refusée');

SELECT pg_temp.doit_echouer($q$INSERT INTO commandes (client_id, adresse_depart, latitude_depart, longitude_depart,
  adresse_arrivee, latitude_arrivee, longitude_arrivee, zone_id, type_colis, poids_kg, distance_km, montant)
  VALUES ('00000000-0000-0000-0000-0000000000c1','Plateau',14.6708,-17.4381,'Plateau',14.6708,-17.4381,
  (SELECT id FROM zones WHERE nom='Dakar'),'PRODUITS',2,0,1000)$q$, '23514');
SELECT pg_temp.verifier(true, 'Départ identique à l''arrivée refusé');

SET LOCAL app.utilisateur_id = '00000000-0000-0000-0000-0000000000c1';
INSERT INTO commandes (id, client_id, adresse_depart, latitude_depart, longitude_depart,
  adresse_arrivee, latitude_arrivee, longitude_arrivee, zone_id, type_colis, poids_kg, distance_km, montant)
VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1',
  'Plateau',14.6708,-17.4381,'Almadies',14.7453,-17.5134,(SELECT id FROM zones WHERE nom='Dakar'),
  'PRODUITS',2,11.3,2250);
SELECT pg_temp.verifier((SELECT numero ~ '^CMD-\d{6}$' FROM commandes WHERE id='00000000-0000-0000-0000-0000000000e1'),
  'Numéro de commande généré au format CMD-000000');
SELECT pg_temp.verifier((SELECT count(*) = 1 AND bool_and(nouveau_statut='NOUVELLE' AND auteur_id IS NOT NULL)
  FROM historique_statuts WHERE commande_id='00000000-0000-0000-0000-0000000000e1'),
  'Création tracée dans l''historique avec son auteur');

-- 3. Transitions ------------------------------------------------------------
SET LOCAL app.utilisateur_id = '00000000-0000-0000-0000-00000000000a';
SELECT pg_temp.doit_echouer($q$UPDATE commandes SET statut='LIVREE'
  WHERE id='00000000-0000-0000-0000-0000000000e1'$q$, 'SD001');
SELECT pg_temp.verifier(true, 'Saut de statut NOUVELLE -> LIVREE refusé');

UPDATE commandes SET statut='VALIDEE' WHERE id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier(true, 'Validation NOUVELLE -> VALIDEE acceptée');

SELECT pg_temp.doit_echouer($q$UPDATE commandes SET adresse_arrivee='Yoff'
  WHERE id='00000000-0000-0000-0000-0000000000e1'$q$, 'SD003');
SELECT pg_temp.verifier(true, 'Modification du contenu après validation refusée');

SELECT pg_temp.doit_echouer($q$UPDATE commandes SET statut='LIVREUR_AFFECTE'
  WHERE id='00000000-0000-0000-0000-0000000000e1'$q$, 'SD002');
SELECT pg_temp.verifier(true, 'Statut LIVREUR_AFFECTE sans livraison refusé');

-- 4. Affectation ------------------------------------------------------------
SELECT pg_temp.doit_echouer($q$INSERT INTO livraisons (commande_id, livreur_id, montant)
  VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d2',1800)$q$, 'SD004');
SELECT pg_temp.verifier(true, 'Affectation à un livreur indisponible refusée');

INSERT INTO livraisons (commande_id, livreur_id, montant)
VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d1',1800);
UPDATE commandes SET statut='LIVREUR_AFFECTE' WHERE id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier(true, 'Affectation à un livreur disponible acceptée');

SELECT pg_temp.doit_echouer($q$UPDATE livraisons SET statut='LIVREE'
  WHERE commande_id='00000000-0000-0000-0000-0000000000e1'$q$, 'SD005');
SELECT pg_temp.verifier(true, 'Statut de livraison non modifiable directement');

-- 5. Refus puis réaffectation ------------------------------------------
SET LOCAL app.utilisateur_id = '00000000-0000-0000-0000-0000000000d1';
SET LOCAL app.motif = 'Indisponible sur ce trajet';
UPDATE commandes SET statut='VALIDEE' WHERE id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier(NOT EXISTS (SELECT 1 FROM livraisons WHERE commande_id='00000000-0000-0000-0000-0000000000e1'),
  'Refus : livraison libérée, commande revenue à VALIDEE');
SELECT pg_temp.verifier(EXISTS (SELECT 1 FROM historique_statuts WHERE commande_id='00000000-0000-0000-0000-0000000000e1'
  AND ancien_statut='LIVREUR_AFFECTE' AND nouveau_statut='VALIDEE' AND motif='Indisponible sur ce trajet'),
  'Refus tracé avec son motif');
RESET app.motif;

SET LOCAL app.utilisateur_id = '00000000-0000-0000-0000-00000000000a';
INSERT INTO livraisons (commande_id, livreur_id, montant)
VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d1',1800);
UPDATE commandes SET statut='LIVREUR_AFFECTE' WHERE id='00000000-0000-0000-0000-0000000000e1';

-- 6. Cycle livreur ----------------------------------------------------------
SET LOCAL app.utilisateur_id = '00000000-0000-0000-0000-0000000000d1';
UPDATE commandes SET statut='ACCEPTEE' WHERE id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier((SELECT statut='ACCEPTEE' FROM livraisons WHERE commande_id='00000000-0000-0000-0000-0000000000e1'),
  'Acceptation synchronisée sur la livraison');

SELECT pg_temp.doit_echouer($q$INSERT INTO positions_gps (livraison_id, latitude, longitude)
  SELECT id, 14.68, -17.45 FROM livraisons WHERE commande_id='00000000-0000-0000-0000-0000000000e1'$q$, 'SD006');
SELECT pg_temp.verifier(true, 'Position GPS refusée avant le démarrage');

UPDATE commandes SET statut='EN_COURS' WHERE id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier((SELECT statut='EN_COURS' AND date_debut IS NOT NULL FROM livraisons
  WHERE commande_id='00000000-0000-0000-0000-0000000000e1'), 'Démarrage : date de début enregistrée');

INSERT INTO positions_gps (livraison_id, latitude, longitude)
SELECT id, p.lat, p.lng FROM livraisons,
  (VALUES (14.6800, -17.4500), (14.7100, -17.4800)) AS p(lat, lng)
WHERE commande_id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier((SELECT count(*)=2 FROM positions_gps p JOIN livraisons l ON l.id=p.livraison_id
  WHERE l.commande_id='00000000-0000-0000-0000-0000000000e1'), 'Positions GPS enregistrées pendant la livraison');

SELECT pg_temp.doit_echouer($q$INSERT INTO positions_gps (livraison_id, latitude, longitude)
  SELECT id, 95, -17.45 FROM livraisons WHERE commande_id='00000000-0000-0000-0000-0000000000e1'$q$, '23514');
SELECT pg_temp.verifier(true, 'Coordonnée GPS hors limites refusée');

UPDATE commandes SET statut='LIVREE' WHERE id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier((SELECT statut='LIVREE' AND date_fin >= date_debut FROM livraisons
  WHERE commande_id='00000000-0000-0000-0000-0000000000e1'), 'Fin de livraison : date de fin enregistrée');

-- 7. Confirmation et évaluation par le client --------------------------------
SET LOCAL app.utilisateur_id = '00000000-0000-0000-0000-0000000000c1';
SELECT pg_temp.doit_echouer($q$UPDATE livraisons SET note_client=5
  WHERE commande_id='00000000-0000-0000-0000-0000000000e1'$q$, '23514');
SELECT pg_temp.verifier(true, 'Note impossible avant la confirmation');

UPDATE commandes SET statut='CONFIRMEE' WHERE id='00000000-0000-0000-0000-0000000000e1';
UPDATE livraisons SET note_client=4 WHERE commande_id='00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.verifier((SELECT note_moyenne=4.0 AND nombre_evaluations=1 FROM livreurs
  WHERE id='00000000-0000-0000-0000-0000000000d1'), 'Note moyenne du livreur recalculée');

SELECT pg_temp.doit_echouer($q$UPDATE commandes SET statut='ANNULEE'
  WHERE id='00000000-0000-0000-0000-0000000000e1'$q$, 'SD001');
SELECT pg_temp.verifier(true, 'Commande CONFIRMEE non annulable (état final)');

SELECT pg_temp.verifier((SELECT count(*)=9 AND bool_and(auteur_id IS NOT NULL) FROM historique_statuts
  WHERE commande_id='00000000-0000-0000-0000-0000000000e1'), 'Historique complet : 9 changements, tous attribués');

-- 8. Annulation -------------------------------------------------------------
INSERT INTO commandes (id, client_id, adresse_depart, latitude_depart, longitude_depart,
  adresse_arrivee, latitude_arrivee, longitude_arrivee, zone_id, type_colis, poids_kg, distance_km, montant)
VALUES ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c1',
  'Médina',14.6835,-17.4521,'Pikine',14.7549,-17.3903,(SELECT id FROM zones WHERE nom='Pikine'),
  'DOCUMENTS',0.5,10.2,2050);
UPDATE commandes SET statut='ANNULEE' WHERE id='00000000-0000-0000-0000-0000000000e2';
SELECT pg_temp.verifier(true, 'Annulation d''une commande NOUVELLE acceptée');
SELECT pg_temp.doit_echouer($q$UPDATE commandes SET statut='VALIDEE'
  WHERE id='00000000-0000-0000-0000-0000000000e2'$q$, 'SD001');
SELECT pg_temp.verifier(true, 'Commande ANNULEE non réactivable (état final)');

-- 9. Intégrité référentielle et référence -------------------------------------
SELECT pg_temp.doit_echouer($q$DELETE FROM utilisateurs
  WHERE id='00000000-0000-0000-0000-0000000000c1'$q$, '23503');
SELECT pg_temp.verifier(true, 'Suppression d''un client ayant des commandes refusée');

SELECT pg_temp.doit_echouer($q$INSERT INTO parametres_tarification
  (id, prix_base, prix_par_km, montant_minimum, arrondi, part_livreur_pourcentage)
  VALUES (2, 1, 1, 1, 1, 1)$q$, '23514');
SELECT pg_temp.verifier(true, 'Une seule grille de tarification autorisée');

SELECT pg_temp.verifier((SELECT count(*) = 6 FROM zones), 'Zones de référence présentes');

ROLLBACK;
