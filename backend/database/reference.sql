-- =====================================================================
--  Données de RÉFÉRENCE (configuration), pas des données métier.
--  Aucune commande, aucun utilisateur, aucun KPI n'est inséré ici.
-- =====================================================================

-- Zones affichées dans le prototype (Analytique : « Zones les plus actives »).
-- Départements de la région de Dakar + Thiès. Modifiables à tout moment.
INSERT INTO zones (nom, region) VALUES
  ('Dakar',       'Dakar'),
  ('Pikine',      'Dakar'),
  ('Guédiawaye',  'Dakar'),
  ('Rufisque',    'Dakar'),
  ('Keur Massar', 'Dakar'),
  ('Thiès',       'Thiès')
ON CONFLICT (nom) DO NOTHING;

-- Paramètres initiaux de la tarification (modifiables par l'admin).
-- Formule appliquée par le backend :
--   montant = max(montant_minimum, arrondi_sup(prix_base + distance_km * prix_par_km))
INSERT INTO parametres_tarification
  (id, prix_base, prix_par_km, montant_minimum, arrondi, part_livreur_pourcentage)
VALUES (1, 500, 150, 1000, 50, 80)
ON CONFLICT (id) DO NOTHING;
