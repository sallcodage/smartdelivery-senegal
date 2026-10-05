// snake_case (PostgreSQL) → camelCase (JSON de l'API)
const enCamel = (cle) => cle.replace(/_([a-z])/g, (_, lettre) => lettre.toUpperCase());

function camel(ligne) {
  if (!ligne) return ligne;
  const resultat = {};
  for (const [cle, valeur] of Object.entries(ligne)) resultat[enCamel(cle)] = valeur;
  return resultat;
}

const formaterFCFA = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

const nomComplet = (u) => `${u.prenom} ${u.nom}`;

module.exports = { camel, formaterFCFA, nomComplet };
