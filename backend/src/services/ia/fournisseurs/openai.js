// Adaptateur OpenAI (Chat Completions + outils). Utilisable en changeant IA_FOURNISSEUR=openai.
const { ErreurIA, appelHttp } = require('../ErreurIA');

async function converser({ config, systeme, historique = [], question, outils, executerOutil, maxEtapes = 4 }) {
  const messages = [
    { role: 'system', content: systeme },
    ...historique.flatMap((e) => [{ role: 'user', content: e.question }, { role: 'assistant', content: e.reponse }]),
    { role: 'user', content: question },
  ];
  for (let etape = 0; etape < maxEtapes; etape++) {
    const donnees = await appelHttp('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.cle}` },
      body: JSON.stringify({
        model: config.modele,
        messages,
        ...(outils.length && { tools: outils.map(({ nom, description, parametres }) => ({ type: 'function', function: { name: nom, description, parameters: parametres } })) }),
      }),
    }, config.delaiMs);
    const message = donnees.choices?.[0]?.message;
    if (!message) throw new ErreurIA('REPONSE_VIDE');
    if (!message.tool_calls?.length) {
      if (!message.content?.trim()) throw new ErreurIA('REPONSE_VIDE');
      return { texte: message.content.trim() };
    }
    messages.push(message);
    for (const appel of message.tool_calls) {
      let args = {};
      try { args = JSON.parse(appel.function.arguments || '{}'); } catch { /* arguments illisibles : objet vide */ }
      const resultat = await executerOutil(appel.function.name, args);
      messages.push({ role: 'tool', tool_call_id: appel.id, content: JSON.stringify(resultat) });
    }
  }
  throw new ErreurIA('TROP_ETAPES');
}

module.exports = { nom: 'openai', converser };
