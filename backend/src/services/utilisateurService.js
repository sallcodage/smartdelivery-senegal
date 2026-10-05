// Gestion des comptes par l'administrateur.
const { query, transaction } = require('../config/db');
const { camel } = require('../utils/format');
const { SELECT_UTILISATEUR, formaterUtilisateur } = require('../utils/utilisateurs');
const { lirePagination, paginer } = require('../utils/pagination');
const { mettreAJour } = require('../utils/sql');
const { STATUTS_LIVRAISON_ACTIVE } = require('../utils/constantes');
const { creerCompte } = require('./compteService');
const notifications = require('./notificationService');
const profil = require('./profilService');
const { introuvable, conflit } = require('../utils/AppError');

async function lister(filtres) {
  const pagination = lirePagination(filtres);
  const { rows } = await query(
    `SELECT * FROM (
       SELECT x.*, count(*) OVER() AS total FROM (${SELECT_UTILISATEUR}) x
       WHERE ($1::role_utilisateur IS NULL OR x.role = $1)
         AND ($2::statut_compte IS NULL OR x.statut_compte = $2)
         AND ($3::text IS NULL OR (x.nom || ' ' || x.prenom || ' ' || x.email || ' ' || x.telephone) ILIKE '%' || $3 || '%')
       ORDER BY x.date_creation DESC
       LIMIT $4 OFFSET $5) resultat`,
    [filtres.role || null, filtres.statut || null, filtres.recherche || null, pagination.limite, pagination.offset]
  );
  const compteurs = await query('SELECT role, count(*) AS n FROM utilisateurs GROUP BY role');
  const parRole = Object.fromEntries(compteurs.rows.map((r) => [r.role, r.n]));
  return {
    ...paginer(rows.map(formaterUtilisateur), pagination),
    compteurs: {
      TOUS: Object.values(parRole).reduce((a, b) => a + b, 0),
      CLIENT: parRole.CLIENT || 0, LIVREUR: parRole.LIVREUR || 0, ADMIN: parRole.ADMIN || 0,
    },
  };
}

// L'admin peut créer tout type de compte ; les comptes créés par lui sont actifs d'office.
async function creer(d) {
  const id = await transaction((c) => creerCompte(c, d, d.role, 'ACTIF'));
  return profil.obtenir(id);
}

async function modifier(id, d) {
  const actuel = await profil.obtenir(id);
  await transaction(async (c) => {
    await mettreAJour(c, 'utilisateurs', id, { nom: d.nom, prenom: d.prenom, email: d.email, telephone: d.telephone });
    if (actuel.role === 'CLIENT') await mettreAJour(c, 'clients', id, { adresse: d.adresse });
    if (actuel.role === 'LIVREUR') {
      await mettreAJour(c, 'livreurs', id, { vehicule: d.vehicule, numero_permis: d.numeroPermis });
    }
  });
  return profil.obtenir(id);
}

async function livraisonsActives(executant, livreurId) {
  const { rows } = await executant.query(
    'SELECT count(*) AS n FROM livraisons WHERE livreur_id = $1 AND statut = ANY($2::statut_livraison[])',
    [livreurId, STATUTS_LIVRAISON_ACTIVE]
  );
  return rows[0].n;
}

// Activation (dont validation d'un livreur en attente) ou suspension
async function changerStatut(id, statut, admin) {
  if (id === admin.id) throw conflit('Vous ne pouvez pas modifier le statut de votre propre compte');
  const actuel = await profil.obtenir(id);

  await transaction(async (c) => {
    if (statut === 'INACTIF' && actuel.role === 'LIVREUR') {
      if (await livraisonsActives(c, id) > 0) {
        throw conflit('Ce livreur a une livraison en cours : réaffectez-la ou attendez sa fin avant de le suspendre');
      }
      await c.query('UPDATE livreurs SET disponibilite = false WHERE id = $1', [id]);
    }
    await c.query('UPDATE utilisateurs SET statut_compte = $1 WHERE id = $2', [statut, id]);
    if (actuel.statutCompte === 'EN_ATTENTE' && statut === 'ACTIF') {
      await notifications.creer(c, [id], 'Votre compte a été validé. Bienvenue chez SmartDelivery !');
    }
  });
  return profil.obtenir(id);
}

// Suppression physique uniquement si le compte n'a aucun historique ; sinon, suspension.
async function supprimer(id, admin) {
  if (id === admin.id) throw conflit('Vous ne pouvez pas supprimer votre propre compte');
  try {
    const { rowCount } = await query('DELETE FROM utilisateurs WHERE id = $1', [id]);
    if (!rowCount) throw introuvable('Utilisateur introuvable');
  } catch (err) {
    if (err.code === '23503') {
      throw conflit('Ce compte possède un historique (commandes ou livraisons). Suspendez-le plutôt que de le supprimer.');
    }
    throw err;
  }
}

async function listerClients(filtres) {
  const pagination = lirePagination(filtres);
  const { rows } = await query(
    `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.statut_compte, u.date_creation, cl.adresse,
            count(c.id) AS nombre_commandes,
            count(c.id) FILTER (WHERE c.statut = 'CONFIRMEE') AS commandes_confirmees,
            coalesce(sum(c.montant) FILTER (WHERE c.statut = 'CONFIRMEE'), 0) AS montant_total,
            max(c.date_creation) AS derniere_commande,
            count(*) OVER() AS total
     FROM clients cl
     JOIN utilisateurs u ON u.id = cl.id
     LEFT JOIN commandes c ON c.client_id = cl.id
     WHERE ($1::text IS NULL OR (u.nom || ' ' || u.prenom || ' ' || u.email || ' ' || u.telephone) ILIKE '%' || $1 || '%')
     GROUP BY u.id, cl.adresse
     ORDER BY u.date_creation DESC
     LIMIT $2 OFFSET $3`,
    [filtres.recherche || null, pagination.limite, pagination.offset]
  );
  return paginer(rows.map(camel), pagination);
}

module.exports = { lister, creer, modifier, changerStatut, supprimer, listerClients };
