// Outils partagés par les tests d'API.
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const api = () => request(app);
let compteur = 0;
const unique = () => `${Date.now().toString(36)}${(compteur++).toString(36)}`;
const telephoneUnique = () => `77${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
const MOT_DE_PASSE = 'Passe-2026';

// Image PNG valide de 1×1 pixel, pour les tests de téléversement
const IMAGE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'
);

// Inscription livreur en multipart (formulaire + photos)
function envoyerInscriptionLivreur(champs, fichiers = { photoPermis: IMAGE_PNG }) {
  let requete = api().post('/api/auth/inscription/livreur');
  for (const [cle, valeur] of Object.entries(champs)) requete = requete.field(cle, String(valeur));
  for (const [cle, contenu] of Object.entries(fichiers)) requete = requete.attach(cle, contenu, `${cle}.png`);
  return requete;
}

// Coordonnées réelles de Dakar
const LIEUX = {
  plateau: { adresse: 'Place de l\'Indépendance, Plateau', latitude: 14.6692, longitude: -17.4374 },
  almadies: { adresse: 'Pointe des Almadies', latitude: 14.7453, longitude: -17.5134 },
  medina: { adresse: 'Marché Tilène, Médina', latitude: 14.6835, longitude: -17.4521 },
  pikine: { adresse: 'Marché Zinc, Pikine', latitude: 14.7549, longitude: -17.3903 },
  ouakam: { adresse: 'Ouakam', latitude: 14.7236, longitude: -17.4880 },
};

function corpsCommande(depart = LIEUX.plateau, arrivee = LIEUX.almadies, extra = {}) {
  return {
    adresseDepart: depart.adresse, latitudeDepart: depart.latitude, longitudeDepart: depart.longitude,
    adresseArrivee: arrivee.adresse, latitudeArrivee: arrivee.latitude, longitudeArrivee: arrivee.longitude,
    zoneId: 1, typeColis: 'PRODUITS', poidsKg: 2.5, ...extra,
  };
}

async function inscrireEtConnecterClient(extra = {}) {
  const email = `client.${unique()}@test.sn`;
  const res = await api().post('/api/auth/inscription/client').send({
    nom: 'Ndiaye', prenom: 'Awa', email, telephone: telephoneUnique(), motDePasse: MOT_DE_PASSE,
    confirmationMotDePasse: MOT_DE_PASSE, adresse: 'Sacré-Cœur 3, Dakar', ...extra,
  });
  if (res.status !== 201) throw new Error(`Inscription client : ${res.status} ${JSON.stringify(res.body)}`);
  return connecter(email);
}

async function connecter(email, motDePasse = MOT_DE_PASSE) {
  const res = await api().post('/api/auth/connexion').send({ email, motDePasse });
  if (res.status !== 200) throw new Error(`Connexion ${email} : ${res.status} ${JSON.stringify(res.body)}`);
  return { jeton: res.body.jeton, ...res.body.utilisateur, email };
}

// Seul moyen de créer le premier admin : directement en base (comme scripts/create-admin.js)
async function creerAdmin() {
  const email = `admin.${unique()}@test.sn`;
  const hash = await bcrypt.hash(MOT_DE_PASSE, 4);
  const { rows } = await pool.query(
    `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone, role)
     VALUES ('Mbaye', 'Khadija', $1, $2, $3, 'ADMIN') RETURNING id`,
    [email, hash, telephoneUnique()]
  );
  await pool.query('INSERT INTO administrateurs (id) VALUES ($1)', [rows[0].id]);
  return connecter(email);
}

// Inscription publique d'un livreur puis validation par un admin
async function creerLivreurActif(admin, extra = {}) {
  const email = `livreur.${unique()}@test.sn`;
  const res = await envoyerInscriptionLivreur({
    nom: 'Diop', prenom: 'Moussa', email, telephone: telephoneUnique(), motDePasse: MOT_DE_PASSE,
    confirmationMotDePasse: MOT_DE_PASSE, vehicule: 'MOTO', numeroPermis: `SN-${unique()}`, ...extra,
  });
  if (res.status !== 201) throw new Error(`Inscription livreur : ${JSON.stringify(res.body)}`);
  await api().patch(`/api/admin/utilisateurs/${res.body.utilisateur.id}/statut`)
    .set(auth(admin)).send({ statut: 'ACTIF' }).expect(200);
  return connecter(email);
}

const auth = (u) => ({ Authorization: `Bearer ${u.jeton}` });

module.exports = {
  api, pool, auth, unique, IMAGE_PNG, envoyerInscriptionLivreur, telephoneUnique, MOT_DE_PASSE, LIEUX, corpsCommande,
  inscrireEtConnecterClient, connecter, creerAdmin, creerLivreurActif,
};
