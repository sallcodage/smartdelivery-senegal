// Notifications enregistrées dans PostgreSQL. `executant` = pool ou client de transaction,
// pour que la notification soit créée dans la même transaction que l'événement.
const { query } = require('../config/db');
const { camel } = require('../utils/format');
const { lirePagination, paginer } = require('../utils/pagination');
const { introuvable } = require('../utils/AppError');

async function creer(executant, utilisateurIds, message, commandeId = null) {
  const ids = [...new Set(utilisateurIds.filter(Boolean))];
  if (!ids.length) return;
  await executant.query(
    `INSERT INTO notifications (utilisateur_id, message, commande_id)
     SELECT unnest($1::uuid[]), $2, $3`,
    [ids, message, commandeId]
  );
}

async function notifierAdmins(executant, message, commandeId = null) {
  await executant.query(
    `INSERT INTO notifications (utilisateur_id, message, commande_id)
     SELECT id, $1, $2 FROM utilisateurs WHERE role = 'ADMIN' AND statut_compte = 'ACTIF'`,
    [message, commandeId]
  );
}

async function lister(utilisateurId, filtres) {
  const pagination = lirePagination(filtres);
  const { rows } = await query(
    `SELECT n.id, n.message, n.statut, n.date_creation, n.commande_id, c.numero AS commande_numero,
            count(*) OVER() AS total
     FROM notifications n
     LEFT JOIN commandes c ON c.id = n.commande_id
     WHERE n.utilisateur_id = $1 AND ($2::statut_notification IS NULL OR n.statut = $2)
     ORDER BY n.date_creation DESC
     LIMIT $3 OFFSET $4`,
    [utilisateurId, filtres.statut || null, pagination.limite, pagination.offset]
  );
  const nonLues = await query(
    "SELECT count(*) AS n FROM notifications WHERE utilisateur_id = $1 AND statut = 'NON_LUE'", [utilisateurId]
  );
  return { ...paginer(rows.map(camel), pagination), nonLues: nonLues.rows[0].n };
}

async function marquerLue(id, utilisateurId) {
  const { rows } = await query(
    `UPDATE notifications SET statut = 'LUE' WHERE id = $1 AND utilisateur_id = $2
     RETURNING id, message, statut, date_creation, commande_id`,
    [id, utilisateurId]
  );
  if (!rows[0]) throw introuvable('Notification introuvable');
  return camel(rows[0]);
}

async function marquerToutesLues(utilisateurId) {
  const { rowCount } = await query(
    "UPDATE notifications SET statut = 'LUE' WHERE utilisateur_id = $1 AND statut = 'NON_LUE'", [utilisateurId]
  );
  return { misesAJour: rowCount };
}

module.exports = { creer, notifierAdmins, lister, marquerLue, marquerToutesLues };
