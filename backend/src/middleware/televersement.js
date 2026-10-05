// Téléversement des photos (multer) : JPG, PNG ou WEBP, 2 Mo maximum.
// Le contenu réel du fichier est vérifié (signature binaire), pas seulement son extension.
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/app');
const { requeteInvalide } = require('../utils/AppError');

// Champ du formulaire → sous-dossier. « profils » est public, « documents » est protégé.
const CATEGORIES = { photo: 'profils', photoPermis: 'documents', photoVehicule: 'documents' };
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const TAILLE_MAX = 2 * 1024 * 1024;

const stockage = multer.diskStorage({
  destination(req, fichier, cb) {
    const dossier = path.join(config.dossierUploads, CATEGORIES[fichier.fieldname]);
    fs.mkdirSync(dossier, { recursive: true });
    cb(null, dossier);
  },
  filename(req, fichier, cb) {
    cb(null, `${crypto.randomUUID()}${EXTENSIONS[fichier.mimetype]}`); // nom aléatoire, jamais celui de l'utilisateur
  },
});

const multerImages = multer({
  storage: stockage,
  limits: { fileSize: TAILLE_MAX, files: 3 },
  fileFilter(req, fichier, cb) {
    if (!CATEGORIES[fichier.fieldname]) return cb(requeteInvalide(`Champ de fichier inattendu : ${fichier.fieldname}`));
    if (!EXTENSIONS[fichier.mimetype]) return cb(requeteInvalide('Format accepté : JPG, PNG ou WEBP'));
    return cb(null, true);
  },
});

const listerFichiers = (req) => (req.file ? [req.file] : Object.values(req.files || {}).flat());

function supprimerFichiers(req) {
  for (const fichier of listerFichiers(req)) fs.unlink(fichier.path, () => {});
}

// Signatures binaires : JPEG FF D8 FF, PNG 89 50 4E 47, WEBP « RIFF….WEBP »
function estUneImage(chemin) {
  const tampon = Buffer.alloc(12);
  const fd = fs.openSync(chemin, 'r');
  fs.readSync(fd, tampon, 0, 12, 0);
  fs.closeSync(fd);
  return (tampon[0] === 0xff && tampon[1] === 0xd8 && tampon[2] === 0xff)
    || tampon.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    || (tampon.toString('ascii', 0, 4) === 'RIFF' && tampon.toString('ascii', 8, 12) === 'WEBP');
}

function verifierImages(req, res, next) {
  if (listerFichiers(req).some((f) => !estUneImage(f.path))) {
    throw requeteInvalide('Le fichier envoyé n\'est pas une image valide');
  }
  next();
}

// Utilisation : ...televerser.champs(['photo', 'photoPermis']) ou televerser.unique('photo')
const televerser = {
  champs: (noms) => [multerImages.fields(noms.map((name) => ({ name, maxCount: 1 }))), verifierImages],
  unique: (nom) => [multerImages.single(nom), verifierImages],
};

// Chemin stocké en base, ex. « profils/7f1c….jpg »
const cheminRelatif = (fichier) => (fichier ? `${CATEGORIES[fichier.fieldname]}/${fichier.filename}` : null);
const fichierDuChamp = (req, champ) => req.files?.[champ]?.[0] || (req.file?.fieldname === champ ? req.file : null);

module.exports = { televerser, supprimerFichiers, cheminRelatif, fichierDuChamp, TAILLE_MAX };
