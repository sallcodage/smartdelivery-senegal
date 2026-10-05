// Met à jour uniquement les colonnes fournies (les noms de colonnes viennent du code, jamais de l'utilisateur).
async function mettreAJour(executant, table, id, champs) {
  const entrees = Object.entries(champs).filter(([, valeur]) => valeur !== undefined);
  if (!entrees.length) return;
  const affectations = entrees.map(([colonne], i) => `${colonne} = $${i + 2}`).join(', ');
  await executant.query(`UPDATE ${table} SET ${affectations} WHERE id = $1`, [id, ...entrees.map(([, v]) => v)]);
}

module.exports = { mettreAJour };
