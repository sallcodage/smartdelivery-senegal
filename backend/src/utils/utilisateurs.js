// Lecture d'un utilisateur avec les informations de sa classe fille (jamais le mot de passe).
const { camel } = require('./format');

// « profils/x.jpg » → /api/fichiers/profils/x.jpg (public) ; « documents/y.png » → route protégée
const urlFichier = (chemin) => (chemin ? `/api/fichiers/${chemin}` : null);

const SELECT_UTILISATEUR = `
  SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.role, u.statut_compte, u.photo_url, u.date_creation,
         c.adresse,
         l.vehicule, l.numero_permis, l.photo_permis_url, l.photo_vehicule_url, l.disponibilite, l.note_moyenne, l.nombre_evaluations
  FROM utilisateurs u
  LEFT JOIN clients  c ON c.id = u.id
  LEFT JOIN livreurs l ON l.id = u.id`;

function formaterUtilisateur(ligne) {
  const u = camel(ligne);
  const resultat = {
    id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, telephone: u.telephone,
    role: u.role, statutCompte: u.statutCompte, photoUrl: urlFichier(u.photoUrl), dateCreation: u.dateCreation,
  };
  if (u.role === 'CLIENT') resultat.adresse = u.adresse;
  if (u.role === 'LIVREUR') {
    Object.assign(resultat, {
      vehicule: u.vehicule, numeroPermis: u.numeroPermis,
      photoPermisUrl: urlFichier(u.photoPermisUrl), photoVehiculeUrl: urlFichier(u.photoVehiculeUrl),
      disponibilite: u.disponibilite,
      noteMoyenne: u.noteMoyenne, nombreEvaluations: u.nombreEvaluations,
    });
  }
  if (u.total !== undefined) resultat.total = u.total;
  return resultat;
}

module.exports = { SELECT_UTILISATEUR, formaterUtilisateur, urlFichier };
