const { body, query } = require('express-validator');
const r = require('./communs');

// Fonction : chaque appel crée de nouvelles règles (.optional() modifie la règle sur place)
const champsCommande = () => [
  r.texte('adresseDepart', 255), r.latitude('latitudeDepart'), r.longitude('longitudeDepart'),
  r.texte('adresseArrivee', 255), r.latitude('latitudeArrivee'), r.longitude('longitudeArrivee'),
  body('zoneId').isInt({ min: 1 }).withMessage('Zone invalide').toInt(),
  r.typeColis(),
  body('poidsKg').isFloat({ gt: 0, max: 9999 }).withMessage('Poids invalide (kg)').toFloat(),
];

module.exports = {
  lister: [
    r.filtreStatuts(), ...r.pagination(),
    query('clientId').optional().isUUID(), query('livreurId').optional().isUUID(),
    query('zoneId').optional().isInt({ min: 1 }).toInt(),
    query('du').optional().isISO8601().withMessage('Date de début invalide (AAAA-MM-JJ)'),
    query('au').optional().isISO8601().withMessage('Date de fin invalide (AAAA-MM-JJ)'),
  ],
  creer: champsCommande(),
  modifier: [r.idParam(), ...champsCommande().map((regle) => regle.optional())],
  id: [r.idParam()],
  affecter: [
    r.idParam(),
    body('livreurId').optional().isUUID().withMessage('Livreur invalide'),
    body('automatique').optional().isBoolean().toBoolean(),
    body().custom((b) => Boolean(b.livreurId) !== Boolean(b.automatique))
      .withMessage('Indiquez soit un livreur (livreurId), soit l\'affectation automatique'),
  ],
  refuser: [r.idParam(), r.texte('motif', 255)],
  annuler: [r.idParam(), r.texte('motif', 255).optional()],
  confirmer: [r.idParam(), body('note').optional().isInt({ min: 1, max: 5 }).withMessage('Note de 1 à 5').toInt()],
  position: [r.idParam(), r.latitude('latitude'), r.longitude('longitude')],
  estimation: [
    r.latitude('latitudeDepart'), r.longitude('longitudeDepart'),
    r.latitude('latitudeArrivee'), r.longitude('longitudeArrivee'),
  ],
};
