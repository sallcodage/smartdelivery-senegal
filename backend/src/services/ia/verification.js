// ─────────────────────────────────────────────────────────────────────
//  Garde-fou contre les informations inventées.
//  Tout numéro de commande, montant en FCFA ou durée en minutes cité dans la
//  réponse doit provenir des données réelles (résultats des outils) ou de la
//  question du client. Sinon la réponse est rejetée.
// ─────────────────────────────────────────────────────────────────────
const { query } = require('../../config/db');

const RE_NUMERO = /CMD-\d{6}/gi;
const RE_MONTANT = /(\d[\d\s\u00a0\u202f.]*)\s*(?:FCFA|F\s?CFA|francs?\s+CFA|XOF)/gi;
const RE_MINUTES = /(\d+)\s*(?:min\b|minutes?)/gi;
const entier = (texte) => Number(String(texte).replace(/[\s\u00a0\u202f.]/g, ''));

// Tous les nombres présents dans les résultats d'outils (valeurs autorisées)
function nombresDe(valeur, ensemble = new Set()) {
  if (typeof valeur === 'number') { ensemble.add(Math.round(valeur)); ensemble.add(valeur); }
  else if (typeof valeur === 'string') {
    for (const m of valeur.matchAll(/\d[\d\s\u00a0\u202f]*/g)) ensemble.add(entier(m[0]));
  } else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach((v) => nombresDe(v, ensemble));
  return ensemble;
}

async function verifierReponse(texte, { question, traces, client }) {
  const problemes = [];
  const autorises = nombresDe(traces.map((t) => t.resultat));
  nombresDe(question, autorises);

  const numerosCites = [...new Set((texte.match(RE_NUMERO) || []).map((n) => n.toUpperCase()))];
  if (numerosCites.length) {
    const { rows } = await query('SELECT numero FROM commandes WHERE client_id = $1 AND numero = ANY($2)', [client.id, numerosCites]);
    const connus = new Set([...rows.map((r) => r.numero), ...(question.match(RE_NUMERO) || []).map((n) => n.toUpperCase())]);
    numerosCites.filter((n) => !connus.has(n)).forEach((n) => problemes.push(`numéro inconnu ${n}`));
  }
  for (const m of texte.matchAll(RE_MONTANT)) {
    const montant = entier(m[1]);
    if (!autorises.has(montant)) problemes.push(`montant non vérifié ${montant} FCFA`);
  }
  for (const m of texte.matchAll(RE_MINUTES)) {
    if (!autorises.has(Number(m[1]))) problemes.push(`durée non vérifiée ${m[1]} min`);
  }
  return { valide: problemes.length === 0, problemes };
}

module.exports = { verifierReponse };
