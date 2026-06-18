import 'server-only';

/**
 * Appel LLM côté Node via OpenRouter (API compatible OpenAI).
 * Renvoie le texte, ou `null` si aucune clé n'est configurée / en cas d'erreur
 * — l'appelant doit prévoir un repli déterministe.
 */
export async function openRouterComplete(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'VendorShield',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-oss-120b:free',
        temperature: 0.3,
        max_tokens: params.maxTokens ?? 400,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[openrouter]', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return (data.choices?.[0]?.message?.content as string)?.trim() ?? null;
  } catch (error) {
    console.error('[openrouter] erreur:', error);
    return null;
  }
}
