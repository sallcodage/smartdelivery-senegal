// Adaptateur Anthropic (Messages API + outils). Utilisable en changeant IA_FOURNISSEUR=anthropic.
const { ErreurIA, appelHttp } = require('../ErreurIA');

async function converser({ config, systeme, historique = [], question, outils, executerOutil, maxEtapes = 4 }) {
  const messages = [
    ...historique.flatMap((e) => [{ role: 'user', content: e.question }, { role: 'assistant', content: e.reponse }]),
    { role: 'user', content: question },
  ];
  for (let etape = 0; etape < maxEtapes; etape++) {
    const donnees = await appelHttp('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.cle, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: config.modele, max_tokens: 1024, temperature: 0.2, system: systeme, messages,
        ...(outils.length && { tools: outils.map(({ nom, description, parametres }) => ({ name: nom, description, input_schema: parametres })) }),
      }),
    }, config.delaiMs);
    const blocs = donnees.content || [];
    const appels = blocs.filter((b) => b.type === 'tool_use');
    if (!appels.length) {
      const texte = blocs.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
      if (!texte) throw new ErreurIA('REPONSE_VIDE');
      return { texte };
    }
    messages.push({ role: 'assistant', content: blocs });
    const resultats = [];
    for (const appel of appels) {
      resultats.push({ type: 'tool_result', tool_use_id: appel.id, content: JSON.stringify(await executerOutil(appel.name, appel.input || {})) });
    }
    messages.push({ role: 'user', content: resultats });
  }
  throw new ErreurIA('TROP_ETAPES');
}

module.exports = { nom: 'anthropic', converser };
