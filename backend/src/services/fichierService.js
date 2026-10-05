// Accès aux fichiers téléversés et remplacement de la photo de profil.
const fs = require('fs');
const path = require('path');
const config = require('../config/app');
const { query } = require('../config/db');
const { introuvable, requeteInvalide } = require('../utils/AppError');

const NOM_VALIDE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

// Documents (permis, véhicule) : visibles par l'admin et par le livreur concerné uniquement
async function cheminDocument(nom, utilisateur) {
  if (!NOM_VALIDE.test(nom)) throw introuvable('Document introuvable');
  const chemin = `documents/${nom}`;
  if (utilisateur.role !== 'ADMIN') {
    const { rows } = await query(
      'SELECT 1 FROM livreurs WHERE id = $1 AND $2 IN (photo_permis_url, photo_vehicule_url)', [utilisateur.id, chemin]
    );
    if (!rows.length) throw introuvable('Document introuvable');
  }
  const absolu = path.join(config.dossierUploads, chemin);
  if (!fs.existsSync(absolu)) throw introuvable('Document introuvable');
  return absolu;
}

async function remplacerPhotoProfil(utilisateurId, nouveauChemin) {
  if (!nouveauChemin) throw requeteInvalide('Aucune photo reçue (champ « photo »)');
  const { rows } = await query(
    `UPDATE utilisateurs u SET photo_url = $1 FROM utilisateurs ancien
     WHERE u.id = $2 AND ancien.id = u.id RETURNING ancien.photo_url AS ancienne`,
    [nouveauChemin, utilisateurId]
  );
  if (rows[0]?.ancienne) fs.unlink(path.join(config.dossierUploads, rows[0].ancienne), () => {});
}

module.exports = { cheminDocument, remplacerPhotoProfil };
