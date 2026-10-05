// ─────────────────────────────────────────────────────────────────────
//  Tarification : formule UNIQUE et centralisée.
//  montant = max(minimum, arrondi_supérieur(prix_base + distance × prix_par_km))
//  Les paramètres sont en base (modifiables par l'admin), la formule est ici.
// ─────────────────────────────────────────────────────────────────────
const { pool } = require('../config/db');
const { camel } = require('../utils/format');
const { distanceKm, arrondir } = require('../utils/geo');

async function obtenirParametres(executant = pool) {
  const { rows } = await executant.query(
    `SELECT prix_base, prix_par_km, montant_minimum, arrondi, part_livreur_pourcentage, date_modification
     FROM parametres_tarification WHERE id = 1`
  );
  if (!rows[0]) throw new Error('Paramètres de tarification absents : lancez « npm run db:init »');
  return camel(rows[0]);
}

function calculerMontant(distance, p) {
  const brut = p.prixBase + distance * p.prixParKm;
  const arrondiSuperieur = Math.ceil(brut / p.arrondi) * p.arrondi;
  return Math.max(p.montantMinimum, arrondiSuperieur);
}

const calculerPartLivreur = (montant, p) => Math.round((montant * p.partLivreurPourcentage) / 100);

const distanceTrajet = (d) => arrondir(distanceKm(d.latitudeDepart, d.longitudeDepart, d.latitudeArrivee, d.longitudeArrivee));

async function estimer(coordonnees) {
  const distance = distanceTrajet(coordonnees);
  const parametres = await obtenirParametres();
  return { distanceKm: distance, montant: calculerMontant(distance, parametres) };
}

async function modifierParametres(d, adminId) {
  const { rows } = await pool.query(
    `UPDATE parametres_tarification
     SET prix_base = $1, prix_par_km = $2, montant_minimum = $3, arrondi = $4,
         part_livreur_pourcentage = $5, modifie_par = $6
     WHERE id = 1
     RETURNING prix_base, prix_par_km, montant_minimum, arrondi, part_livreur_pourcentage, date_modification`,
    [d.prixBase, d.prixParKm, d.montantMinimum, d.arrondi, d.partLivreurPourcentage, adminId]
  );
  return camel(rows[0]);
}

// Aperçu de nouveaux paramètres avant enregistrement (même formule que pour les vraies commandes)
function simuler(parametres, distances) {
  return distances.map((distanceKm) => {
    const montant = calculerMontant(distanceKm, parametres);
    return { distanceKm, montant, partLivreur: calculerPartLivreur(montant, parametres) };
  });
}

module.exports = { simuler, obtenirParametres, calculerMontant, calculerPartLivreur, distanceTrajet, estimer, modifierParametres };
