// ─────────────────────────────────────────────────────────────────────
//  Assistant SmartDelivery : orchestration.
//  question → IA (avec outils) → garde-fou → [mode secours] → enregistrement
// ─────────────────────────────────────────────────────────────────────
const { query } = require('../config/db');
const { camel } = require('../utils/format');
const { lirePagination, paginer } = require('../utils/pagination');
const { lireConfiguration } = require('./ia/configuration');
const { adaptateur } = require('./ia/fournisseurs');
const { ErreurIA } = require('./ia/ErreurIA');
const outils = require('./ia/outils');
const { consigneSysteme } = require('./ia/consigne');
const { verifierReponse } = require('./ia/verification');
const { repondreEnSecours } = require('./ia/secours');

const ECHANGES_DE_CONTEXTE = 6; // mémoire de la conversation envoyée à l'IA

async function derniersEchanges(clientId) {
  const { rows } = await query(
    'SELECT question, reponse FROM conversations_ia WHERE client_id = $1 ORDER BY date_heure DESC LIMIT $2',
    [clientId, ECHANGES_DE_CONTEXTE]
  );
  return rows.reverse();
}

const AVERTISSEMENTS = {
  NON_CONFIGURE: "L'assistant IA n'est pas configuré : réponse fournie directement à partir de vos données SmartDelivery.",
  DESACTIVE: "L'assistant IA est désactivé : réponse fournie directement à partir de vos données SmartDelivery.",
  VERIFICATION: 'La réponse de l\'IA contenait une information non vérifiable : elle a été remplacée par les données exactes de SmartDelivery.',
  AUTRE: "L'assistant IA est momentanément indisponible : réponse fournie directement à partir de vos données SmartDelivery.",
};

async function poserQuestion(client, question) {
  const config = lireConfiguration();
  const contexte = { client, traces: [], question };
  let reponse = null;
  let motifSecours = null;

  if (!config.disponible) {
    motifSecours = config.raisonIndisponible;
  } else {
    try {
      const { texte } = await adaptateur(config.fournisseur).converser({
        config,
        systeme: consigneSysteme(client),
        historique: await derniersEchanges(client.id),
        question,
        outils: outils.DEFINITIONS,
        executerOutil: (nom, args) => outils.executer(nom, args, contexte),
      });
      const verification = await verifierReponse(texte, contexte);
      if (verification.valide) reponse = texte;
      else {
        motifSecours = 'VERIFICATION';
        console.warn('[Assistant] Réponse rejetée par le garde-fou :', verification.problemes.join(', '));
      }
    } catch (err) {
      motifSecours = err instanceof ErreurIA ? err.code : 'INDISPONIBLE';
      // Journal serveur sans la clé ni le contenu de la question
      console.error(`[Assistant] ${config.fournisseur}/${config.modele} : ${err.code || err.message}${err.detail ? ` (${err.detail})` : ''}`);
    }
  }

  if (motifSecours) reponse = await repondreEnSecours(question, contexte);

  const commandeConsultee = contexte.traces.find((t) => t.nom === 'consulter_commande' && t.resultat?.trouve);
  const { rows } = await query(
    `INSERT INTO conversations_ia (client_id, commande_id, question, reponse, fournisseur, modele)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, question, reponse, date_heure`,
    [client.id, commandeConsultee?.resultat.commande_id || null, question, reponse,
      motifSecours ? 'secours' : config.fournisseur, motifSecours ? null : config.modele]
  );

  return {
    conversation: { ...camel(rows[0]), commandeNumero: commandeConsultee?.resultat.numero || null },
    mode: motifSecours ? 'secours' : 'ia',
    avertissement: motifSecours ? (AVERTISSEMENTS[motifSecours] || AVERTISSEMENTS.AUTRE) : null,
    outilsUtilises: [...new Set(contexte.traces.map((t) => t.nom))],
  };
}

async function historique(clientId, filtres) {
  const pagination = lirePagination(filtres);
  const { rows } = await query(
    `SELECT ci.id, ci.question, ci.reponse, ci.date_heure, ci.fournisseur, c.numero AS commande_numero,
            count(*) OVER() AS total
     FROM conversations_ia ci LEFT JOIN commandes c ON c.id = ci.commande_id
     WHERE ci.client_id = $1
     ORDER BY ci.date_heure DESC, ci.id DESC
     LIMIT $2 OFFSET $3`,
    [clientId, pagination.limite, pagination.offset]
  );
  return paginer(rows.map((r) => {
    const { fournisseur, ...reste } = camel(r);
    return { ...reste, mode: fournisseur === 'secours' ? 'secours' : 'ia' };
  }), pagination);
}

function etat() {
  const config = lireConfiguration();
  return { disponible: config.disponible, fournisseur: config.disponible ? config.fournisseur : null, modele: config.disponible ? config.modele : null };
}

module.exports = { poserQuestion, historique, etat };
