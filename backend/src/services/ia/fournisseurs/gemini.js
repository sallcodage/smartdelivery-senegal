// ─────────────────────────────────────────────────────────────────────
//  Adaptateur Google Gemini (API REST generateContent, appel de fonctions).
//  Point important (Gemini 3) : le tour du modèle contenant un appel de fonction
//  est renvoyé TEL QUEL, avec ses « thoughtSignature », sinon l'API répond 400.
// ─────────────────────────────────────────────────────────────────────
const { ErreurIA, appelHttp } = require('../ErreurIA');

// Adresse de l'API (modifiable pour un proxy d'entreprise ou un serveur de test)
const base = () => process.env.IA_GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta';

async function converser({ config, systeme, historique = [], question, outils, executerOutil, maxEtapes = 4 }) {
  const contents = [
    ...historique.flatMap((e) => [
      { role: 'user', parts: [{ text: e.question }] },
      { role: 'model', parts: [{ text: e.reponse }] },
    ]),
    { role: 'user', parts: [{ text: question }] },
  ];
  const generationConfig = { temperature: 0.2, maxOutputTokens: 2048 };
  if (config.reflexion) generationConfig.thinkingConfig = { thinkingLevel: config.reflexion };

  for (let etape = 0; etape < maxEtapes; etape++) {
    const corps = {
      systemInstruction: { parts: [{ text: systeme }] },
      contents,
      generationConfig,
      ...(outils.length && {
        tools: [{ functionDeclarations: outils.map(({ nom, description, parametres }) => ({ name: nom, description, parameters: parametres })) }],
      }),
    };
    const donnees = await appelHttp(`${base()}/models/${encodeURIComponent(config.modele)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.cle }, // clé dans l'en-tête, jamais dans l'URL
      body: JSON.stringify(corps),
    }, config.delaiMs);

    const candidat = donnees.candidates?.[0];
    if (donnees.promptFeedback?.blockReason || candidat?.finishReason === 'SAFETY') throw new ErreurIA('BLOQUEE');
    const parties = candidat?.content?.parts;
    if (!parties?.length) throw new ErreurIA('REPONSE_VIDE', candidat?.finishReason);

    const appels = parties.filter((p) => p.functionCall);
    if (!appels.length) {
      const texte = parties.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('').trim();
      if (!texte) throw new ErreurIA('REPONSE_VIDE', candidat.finishReason);
      return { texte };
    }

    contents.push(candidat.content); // conservé à l'identique (signatures de réflexion)
    const reponses = [];
    for (const { functionCall } of appels) {
      const resultat = await executerOutil(functionCall.name, functionCall.args || {});
      reponses.push({
        functionResponse: { name: functionCall.name, ...(functionCall.id && { id: functionCall.id }), response: { output: resultat } },
      });
    }
    contents.push({ role: 'user', parts: reponses }); // toutes les réponses, dans l'ordre des appels
  }
  throw new ErreurIA('TROP_ETAPES');
}

module.exports = { nom: 'gemini', converser };
