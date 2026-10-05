-- =====================================================================
--  SmartDelivery Sénégal : schéma PostgreSQL
--  Source : diagramme de classe du projet + décisions validées (phase 1)
--  Compatible PostgreSQL 13 et plus
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. Types énumérés
-- ---------------------------------------------------------------------
CREATE TYPE role_utilisateur    AS ENUM ('CLIENT', 'LIVREUR', 'ADMIN');
CREATE TYPE statut_compte       AS ENUM ('ACTIF', 'INACTIF', 'EN_ATTENTE');
CREATE TYPE type_vehicule       AS ENUM ('MOTO', 'SCOOTER', 'VELO', 'VOITURE');
CREATE TYPE type_colis          AS ENUM ('DOCUMENTS', 'PRODUITS', 'NOURRITURE', 'AUTRES');
CREATE TYPE statut_commande     AS ENUM ('NOUVELLE', 'VALIDEE', 'LIVREUR_AFFECTE', 'ACCEPTEE',
                                         'EN_COURS', 'LIVREE', 'CONFIRMEE', 'ANNULEE');
CREATE TYPE statut_livraison    AS ENUM ('AFFECTEE', 'ACCEPTEE', 'EN_COURS', 'LIVREE',
                                         'CONFIRMEE', 'ANNULEE');
CREATE TYPE statut_notification AS ENUM ('NON_LUE', 'LUE');
CREATE TYPE type_rapport        AS ENUM ('ACTIVITE_GLOBALE', 'PERFORMANCE_LIVREURS', 'FINANCIER');

-- Met à jour automatiquement la colonne date_modification
CREATE FUNCTION maj_date_modification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.date_modification := now();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------
-- 2. Utilisateurs et héritage (Client, Livreur, Administrateur)
--    Héritage « une table par classe » : chaque table fille partage l'id
--    de utilisateurs. La clé étrangère composite (id, role) garantit
--    qu'un client est forcément un utilisateur de rôle CLIENT, etc.
-- ---------------------------------------------------------------------
CREATE TABLE utilisateurs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               VARCHAR(80)  NOT NULL CHECK (btrim(nom) <> ''),
  prenom            VARCHAR(80)  NOT NULL CHECK (btrim(prenom) <> ''),
  email             VARCHAR(160) NOT NULL UNIQUE
                    CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Seul un hash bcrypt (préfixe $2a$/$2b$/$2y$, 60 caractères) est accepté :
  -- un mot de passe en clair ne peut pas être enregistré.
  mot_de_passe      CHAR(60)     NOT NULL CHECK (mot_de_passe ~ '^\$2[aby]\$\d{2}\$'),
  telephone         VARCHAR(20)  NOT NULL UNIQUE CHECK (telephone ~ '^\+?[0-9]{9,15}$'),
  role              role_utilisateur NOT NULL,
  statut_compte     statut_compte    NOT NULL DEFAULT 'ACTIF',
  photo_url         VARCHAR(255),
  date_creation     TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_modification TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_utilisateurs_id_role UNIQUE (id, role)
);
CREATE TRIGGER trg_utilisateurs_modif BEFORE UPDATE ON utilisateurs
  FOR EACH ROW EXECUTE FUNCTION maj_date_modification();

CREATE TABLE clients (
  id      UUID PRIMARY KEY,
  role    role_utilisateur NOT NULL DEFAULT 'CLIENT' CHECK (role = 'CLIENT'),
  adresse VARCHAR(255) NOT NULL CHECK (btrim(adresse) <> ''),
  CONSTRAINT fk_clients_utilisateur FOREIGN KEY (id, role)
    REFERENCES utilisateurs (id, role) ON DELETE CASCADE
);

CREATE TABLE livreurs (
  id                  UUID PRIMARY KEY,
  role                role_utilisateur NOT NULL DEFAULT 'LIVREUR' CHECK (role = 'LIVREUR'),
  vehicule            type_vehicule NOT NULL,
  numero_permis       VARCHAR(40) UNIQUE,
  photo_permis_url    VARCHAR(255),
  photo_vehicule_url  VARCHAR(255),
  disponibilite       BOOLEAN NOT NULL DEFAULT false,
  note_moyenne        NUMERIC(2,1) CHECK (note_moyenne BETWEEN 1 AND 5), -- NULL tant qu'aucune note
  nombre_evaluations  INTEGER NOT NULL DEFAULT 0 CHECK (nombre_evaluations >= 0),
  -- Dernière position connue (sert à l'affectation automatique au plus proche)
  latitude_actuelle   NUMERIC(9,6) CHECK (latitude_actuelle  BETWEEN -90  AND 90),
  longitude_actuelle  NUMERIC(9,6) CHECK (longitude_actuelle BETWEEN -180 AND 180),
  date_position       TIMESTAMPTZ,
  CONSTRAINT fk_livreurs_utilisateur FOREIGN KEY (id, role)
    REFERENCES utilisateurs (id, role) ON DELETE CASCADE
);

CREATE TABLE administrateurs (
  id   UUID PRIMARY KEY,
  role role_utilisateur NOT NULL DEFAULT 'ADMIN' CHECK (role = 'ADMIN'),
  CONSTRAINT fk_admins_utilisateur FOREIGN KEY (id, role)
    REFERENCES utilisateurs (id, role) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. Données de référence : zones et paramètres de tarification
-- ---------------------------------------------------------------------
CREATE TABLE zones (
  id     SMALLSERIAL PRIMARY KEY,
  nom    VARCHAR(60) NOT NULL UNIQUE,
  region VARCHAR(60) NOT NULL
);

-- Une seule ligne (id = 1). La formule est codée dans le backend
-- (services/tarifService) ; seuls les paramètres sont stockés ici pour
-- être modifiables par l'administrateur sans toucher au code.
CREATE TABLE parametres_tarification (
  id                       SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  prix_base                NUMERIC(10,0) NOT NULL CHECK (prix_base >= 0),
  prix_par_km              NUMERIC(10,0) NOT NULL CHECK (prix_par_km >= 0),
  montant_minimum          NUMERIC(10,0) NOT NULL CHECK (montant_minimum > 0),
  arrondi                  NUMERIC(10,0) NOT NULL CHECK (arrondi > 0),
  part_livreur_pourcentage NUMERIC(5,2)  NOT NULL CHECK (part_livreur_pourcentage BETWEEN 0 AND 100),
  modifie_par              UUID REFERENCES administrateurs (id) ON DELETE SET NULL,
  date_modification        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_tarif_modif BEFORE UPDATE ON parametres_tarification
  FOR EACH ROW EXECUTE FUNCTION maj_date_modification();

-- ---------------------------------------------------------------------
-- 4. Commandes et livraisons
-- ---------------------------------------------------------------------
CREATE SEQUENCE commande_numero_seq;

CREATE TABLE commandes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             VARCHAR(12) NOT NULL UNIQUE
                     DEFAULT ('CMD-' || lpad(nextval('commande_numero_seq')::text, 6, '0')),
  client_id          UUID NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  adresse_depart     VARCHAR(255) NOT NULL CHECK (btrim(adresse_depart) <> ''),
  latitude_depart    NUMERIC(9,6) NOT NULL CHECK (latitude_depart  BETWEEN -90  AND 90),
  longitude_depart   NUMERIC(9,6) NOT NULL CHECK (longitude_depart BETWEEN -180 AND 180),
  adresse_arrivee    VARCHAR(255) NOT NULL CHECK (btrim(adresse_arrivee) <> ''),
  latitude_arrivee   NUMERIC(9,6) NOT NULL CHECK (latitude_arrivee  BETWEEN -90  AND 90),
  longitude_arrivee  NUMERIC(9,6) NOT NULL CHECK (longitude_arrivee BETWEEN -180 AND 180),
  zone_id            SMALLINT NOT NULL REFERENCES zones (id) ON DELETE RESTRICT,
  type_colis         type_colis NOT NULL,
  poids_kg           NUMERIC(6,2) NOT NULL CHECK (poids_kg > 0),
  distance_km        NUMERIC(7,2) NOT NULL CHECK (distance_km >= 0),   -- calculée par le backend
  montant            NUMERIC(10,0) NOT NULL CHECK (montant > 0),       -- calculé par le backend
  statut             statut_commande NOT NULL DEFAULT 'NOUVELLE',
  date_creation      TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_modification  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_commandes_trajet CHECK (
    (latitude_depart, longitude_depart) IS DISTINCT FROM (latitude_arrivee, longitude_arrivee))
);
CREATE INDEX idx_commandes_client  ON commandes (client_id, date_creation DESC);
CREATE INDEX idx_commandes_statut  ON commandes (statut);
CREATE INDEX idx_commandes_date    ON commandes (date_creation);

-- Commande 1 ─ 1 Livraison. La livraison est créée au moment de l'affectation.
CREATE TABLE livraisons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id      UUID NOT NULL UNIQUE REFERENCES commandes (id) ON DELETE CASCADE,
  livreur_id       UUID NOT NULL REFERENCES livreurs (id) ON DELETE RESTRICT,
  statut           statut_livraison NOT NULL DEFAULT 'AFFECTEE',
  date_affectation TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_debut       TIMESTAMPTZ,
  date_fin         TIMESTAMPTZ,
  distance_km      NUMERIC(7,2) CHECK (distance_km >= 0),       -- distance parcourue (GPS)
  montant          NUMERIC(10,0) NOT NULL CHECK (montant >= 0), -- part du livreur
  note_client      SMALLINT CHECK (note_client BETWEEN 1 AND 5),
  CONSTRAINT ck_livraisons_dates CHECK (
    date_fin IS NULL OR (date_debut IS NOT NULL AND date_fin >= date_debut)),
  CONSTRAINT ck_livraisons_note CHECK (note_client IS NULL OR statut = 'CONFIRMEE')
);
CREATE INDEX idx_livraisons_livreur ON livraisons (livreur_id, statut);

CREATE TABLE positions_gps (
  id           BIGSERIAL PRIMARY KEY,
  livraison_id UUID NOT NULL REFERENCES livraisons (id) ON DELETE CASCADE,
  latitude     NUMERIC(9,6) NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude    NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  date_heure   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_positions_livraison ON positions_gps (livraison_id, date_heure DESC);

CREATE TABLE historique_statuts (
  id              BIGSERIAL PRIMARY KEY,
  commande_id     UUID NOT NULL REFERENCES commandes (id) ON DELETE CASCADE,
  ancien_statut   statut_commande,             -- NULL à la création
  nouveau_statut  statut_commande NOT NULL,
  auteur_id       UUID REFERENCES utilisateurs (id) ON DELETE SET NULL,
  motif           VARCHAR(255),
  date_changement TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_historique_commande ON historique_statuts (commande_id, date_changement);

-- ---------------------------------------------------------------------
-- 5. Notifications, assistant IA, rapports, KPI
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  commande_id    UUID REFERENCES commandes (id) ON DELETE SET NULL,
  message        VARCHAR(500) NOT NULL CHECK (btrim(message) <> ''),
  statut         statut_notification NOT NULL DEFAULT 'NON_LUE',
  date_creation  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_utilisateur ON notifications (utilisateur_id, statut, date_creation DESC);

CREATE TABLE conversations_ia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  commande_id UUID REFERENCES commandes (id) ON DELETE SET NULL, -- commande consultée, le cas échéant
  question    TEXT NOT NULL CHECK (char_length(btrim(question)) BETWEEN 1 AND 2000),
  reponse     TEXT NOT NULL,
  fournisseur VARCHAR(30),
  modele      VARCHAR(80),
  date_heure  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_client ON conversations_ia (client_id, date_heure DESC);

CREATE TABLE rapports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              type_rapport NOT NULL,
  periode_debut     DATE NOT NULL,
  periode_fin       DATE NOT NULL,
  fichier_url       VARCHAR(255) NOT NULL,
  administrateur_id UUID REFERENCES administrateurs (id) ON DELETE SET NULL,
  date_generation   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_rapports_periode CHECK (periode_fin >= periode_debut)
);

-- Valeurs de KPI figées au moment de la génération d'un rapport
-- (les dashboards, eux, calculent les KPI en direct).
CREATE TABLE kpis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id    UUID REFERENCES rapports (id) ON DELETE CASCADE,
  nom           VARCHAR(80) NOT NULL,
  valeur        NUMERIC(14,2) NOT NULL,
  unite         VARCHAR(20),
  periode_debut DATE NOT NULL,
  periode_fin   DATE NOT NULL,
  description   VARCHAR(255),
  date_calcul   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_kpis_periode CHECK (periode_fin >= periode_debut)
);

CREATE TABLE reinitialisations_mot_de_passe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  token_hash      CHAR(64) NOT NULL UNIQUE,   -- SHA-256 du jeton, jamais le jeton lui-même
  date_expiration TIMESTAMPTZ NOT NULL,
  utilise_le      TIMESTAMPTZ,
  date_creation   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 6. Règles métier garanties par la base
--    Le backend contrôle QUI peut faire une action ; la base garantit
--    QUE la transition est valide, quel que soit le code qui l'exécute.
-- =====================================================================

-- 6.1 Graphe des transitions de statut d'une commande
CREATE FUNCTION transition_autorisee(ancien statut_commande, nouveau statut_commande)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT (ancien::text || '>' || nouveau::text) = ANY (ARRAY[
    'NOUVELLE>VALIDEE',
    'NOUVELLE>ANNULEE',
    'VALIDEE>LIVREUR_AFFECTE',
    'VALIDEE>ANNULEE',
    'LIVREUR_AFFECTE>ACCEPTEE',
    'LIVREUR_AFFECTE>VALIDEE',      -- refus du livreur : retour pour réaffectation
    'LIVREUR_AFFECTE>ANNULEE',
    'ACCEPTEE>EN_COURS',
    'EN_COURS>LIVREE',
    'LIVREE>CONFIRMEE'
  ]);
$$;

-- 6.2 Création : une commande naît toujours au statut NOUVELLE
CREATE FUNCTION commande_avant_insertion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut <> 'NOUVELLE' THEN
    RAISE EXCEPTION 'Une commande doit être créée au statut NOUVELLE'
      USING ERRCODE = 'SD001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_commandes_insert BEFORE INSERT ON commandes
  FOR EACH ROW EXECUTE FUNCTION commande_avant_insertion();

-- 6.3 Mise à jour : transitions, livraison obligatoire, champs figés
CREATE FUNCTION commande_avant_modification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    IF NOT transition_autorisee(OLD.statut, NEW.statut) THEN
      RAISE EXCEPTION 'Transition interdite : % -> %', OLD.statut, NEW.statut
        USING ERRCODE = 'SD001';
    END IF;
    IF NEW.statut IN ('LIVREUR_AFFECTE','ACCEPTEE','EN_COURS','LIVREE','CONFIRMEE')
       AND NOT EXISTS (SELECT 1 FROM livraisons WHERE commande_id = NEW.id) THEN
      RAISE EXCEPTION 'Statut % impossible : aucune livraison n''est associée', NEW.statut
        USING ERRCODE = 'SD002';
    END IF;
  END IF;

  -- Le contenu d'une commande n'est modifiable qu'au statut NOUVELLE
  IF OLD.statut <> 'NOUVELLE' AND (
       NEW.adresse_depart, NEW.latitude_depart, NEW.longitude_depart,
       NEW.adresse_arrivee, NEW.latitude_arrivee, NEW.longitude_arrivee,
       NEW.zone_id, NEW.type_colis, NEW.poids_kg, NEW.distance_km, NEW.montant, NEW.client_id)
     IS DISTINCT FROM (
       OLD.adresse_depart, OLD.latitude_depart, OLD.longitude_depart,
       OLD.adresse_arrivee, OLD.latitude_arrivee, OLD.longitude_arrivee,
       OLD.zone_id, OLD.type_colis, OLD.poids_kg, OLD.distance_km, OLD.montant, OLD.client_id) THEN
    RAISE EXCEPTION 'La commande % n''est plus modifiable (statut %)', OLD.numero, OLD.statut
      USING ERRCODE = 'SD003';
  END IF;

  NEW.date_modification := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_commandes_update BEFORE UPDATE ON commandes
  FOR EACH ROW EXECUTE FUNCTION commande_avant_modification();

-- 6.4 Après changement de statut : synchronise la livraison et trace l'historique.
--     L'auteur et le motif sont transmis par le backend via
--     SET LOCAL app.utilisateur_id / app.motif dans la transaction.
CREATE FUNCTION commande_apres_changement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    CASE NEW.statut
      WHEN 'ACCEPTEE'  THEN UPDATE livraisons SET statut = 'ACCEPTEE' WHERE commande_id = NEW.id;
      WHEN 'EN_COURS'  THEN UPDATE livraisons SET statut = 'EN_COURS', date_debut = now() WHERE commande_id = NEW.id;
      WHEN 'LIVREE'    THEN UPDATE livraisons SET statut = 'LIVREE',   date_fin   = now() WHERE commande_id = NEW.id;
      WHEN 'CONFIRMEE' THEN UPDATE livraisons SET statut = 'CONFIRMEE' WHERE commande_id = NEW.id;
      WHEN 'ANNULEE'   THEN UPDATE livraisons SET statut = 'ANNULEE'   WHERE commande_id = NEW.id;
      WHEN 'VALIDEE'   THEN
        IF OLD.statut = 'LIVREUR_AFFECTE' THEN   -- refus : on libère la commande
          DELETE FROM livraisons WHERE commande_id = NEW.id;
        END IF;
      ELSE NULL;
    END CASE;
  END IF;

  INSERT INTO historique_statuts (commande_id, ancien_statut, nouveau_statut, auteur_id, motif)
  VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.statut END,
    NEW.statut,
    NULLIF(current_setting('app.utilisateur_id', true), '')::uuid,
    NULLIF(current_setting('app.motif', true), '')
  );
  RETURN NULL;
END $$;
CREATE TRIGGER trg_commandes_historique_insert AFTER INSERT ON commandes
  FOR EACH ROW EXECUTE FUNCTION commande_apres_changement();
CREATE TRIGGER trg_commandes_historique_update AFTER UPDATE OF statut ON commandes
  FOR EACH ROW WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
  EXECUTE FUNCTION commande_apres_changement();

-- 6.5 Affectation : commande validée + livreur actif et disponible
CREATE FUNCTION livraison_avant_insertion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT statut FROM commandes WHERE id = NEW.commande_id) <> 'VALIDEE' THEN
    RAISE EXCEPTION 'Seule une commande VALIDEE peut être affectée' USING ERRCODE = 'SD004';
  END IF;
  IF NOT EXISTS (
       SELECT 1 FROM livreurs l JOIN utilisateurs u ON u.id = l.id
       WHERE l.id = NEW.livreur_id AND l.disponibilite AND u.statut_compte = 'ACTIF') THEN
    RAISE EXCEPTION 'Le livreur doit être actif et disponible' USING ERRCODE = 'SD004';
  END IF;
  IF NEW.statut <> 'AFFECTEE' THEN
    RAISE EXCEPTION 'Une livraison est créée au statut AFFECTEE' USING ERRCODE = 'SD004';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_livraisons_insert BEFORE INSERT ON livraisons
  FOR EACH ROW EXECUTE FUNCTION livraison_avant_insertion();

-- 6.6 Le statut d'une livraison ne change que via celui de sa commande
CREATE FUNCTION livraison_statut_protege() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut IS DISTINCT FROM OLD.statut AND pg_trigger_depth() = 1 THEN
    RAISE EXCEPTION 'Le statut d''une livraison se modifie uniquement via sa commande'
      USING ERRCODE = 'SD005';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_livraisons_statut BEFORE UPDATE ON livraisons
  FOR EACH ROW EXECUTE FUNCTION livraison_statut_protege();

-- 6.7 Une position GPS n'est acceptée que pendant une livraison EN_COURS
CREATE FUNCTION position_avant_insertion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT statut FROM livraisons WHERE id = NEW.livraison_id) <> 'EN_COURS' THEN
    RAISE EXCEPTION 'Position refusée : la livraison n''est pas en cours' USING ERRCODE = 'SD006';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_positions_insert BEFORE INSERT ON positions_gps
  FOR EACH ROW EXECUTE FUNCTION position_avant_insertion();

-- 6.8 Note moyenne du livreur recalculée à chaque évaluation
CREATE FUNCTION recalculer_note_livreur() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE livreurs l SET
    note_moyenne       = s.moyenne,
    nombre_evaluations = s.total
  FROM (SELECT round(avg(note_client), 1) AS moyenne, count(note_client) AS total
        FROM livraisons WHERE livreur_id = NEW.livreur_id AND note_client IS NOT NULL) s
  WHERE l.id = NEW.livreur_id;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_livraisons_note AFTER UPDATE OF note_client ON livraisons
  FOR EACH ROW WHEN (NEW.note_client IS DISTINCT FROM OLD.note_client)
  EXECUTE FUNCTION recalculer_note_livreur();
