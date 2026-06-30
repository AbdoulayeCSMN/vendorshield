import { NextRequest } from 'next/server';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { buildCopilotSystemPrompt } from '~/lib/vendorshield/copilot.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY = 12;

// Chaîne de modèles gratuits *instruct* (réponse directe, PAS de raisonnement —
// les modèles de raisonnement polluent la sortie du copilote). OpenRouter
// bascule sur le suivant si un provider est saturé (429). Surchargeable via
// OPENROUTER_MODELS. Plafonné à 3 (limite OpenRouter).
const MODELS = (
  process.env.OPENROUTER_MODELS ??
  process.env.OPENROUTER_MODEL ??
  [
    'openai/gpt-oss-120b:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ].join(',')
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
  .slice(0, 3);

type LlmResult =
  | { ok: true; res: Response }
  | { ok: false; status: number; detail: string };

type Msg = { role: string; content: string };

// Groq — tier gratuit fiable et rapide (LPU), API compatible OpenAI.
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

async function callGroq(apiKey: string, messages: Msg[]): Promise<LlmResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      temperature: 0.4,
      max_tokens: 1200,
      messages,
    }),
  });
  if (res.ok && res.body) return { ok: true, res };
  return { ok: false, status: res.status, detail: await res.text().catch(() => '') };
}

async function callOpenRouter(apiKey: string, messages: Msg[]): Promise<LlmResult> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Avilyre Copilot',
    },
    body: JSON.stringify({
      ...(MODELS.length > 1 ? { models: MODELS } : { model: MODELS[0] }),
      stream: true,
      temperature: 0.4,
      max_tokens: 1200,
      // Modèles de raisonnement (gpt-oss) : raisonnement minimal → plus rapide.
      reasoning: { effort: 'low' },
      messages,
    }),
  });
  if (res.ok && res.body) return { ok: true, res };
  return { ok: false, status: res.status, detail: await res.text().catch(() => '') };
}

/**
 * Priorité Groq (gratuit + fiable) ; repli OpenRouter `:free` si Groq absent ou
 * en échec. Échec rapide (pas de retry) : le tier gratuit ne se recharge pas en
 * quelques secondes.
 */
async function callLlm(messages: Msg[]): Promise<LlmResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (groqKey) {
    const groq = await callGroq(groqKey, messages);
    if (groq.ok || !openRouterKey) return groq;
    // Groq en échec → on tente OpenRouter.
  }
  if (openRouterKey) return callOpenRouter(openRouterKey, messages);

  return { ok: false, status: 503, detail: 'no-provider' };
}

export async function POST(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: 'Copilote indisponible : configurez GROQ_API_KEY ou OPENROUTER_API_KEY.' },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    messages?: ChatMessage[];
    context?: { supplierId?: string };
  };
  const history = (body.messages ?? [])
    .filter((m) => m.content?.trim())
    .slice(-MAX_HISTORY);

  if (history.length === 0) {
    return Response.json({ error: 'Aucun message.' }, { status: 400 });
  }

  // Valide l'UUID éventuel pour éviter toute requête parasite.
  const supplierId =
    body.context?.supplierId && /^[0-9a-f-]{36}$/i.test(body.context.supplierId)
      ? body.context.supplierId
      : undefined;

  // Le snapshot de données ne doit jamais faire planter le copilote : si un
  // getter échoue (ex. table/colonne absente faute de migration), on bascule
  // sur un prompt minimal.
  let system: string;
  try {
    system = await buildCopilotSystemPrompt(supplierId);
  } catch (err) {
    console.error('[copilot] échec construction du contexte:', err);
    system =
      'Tu es le copilote Avilyre, assistant pour la gestion et l’anticipation du risque fournisseur. Réponds en français, de façon concise, professionnelle et actionnable.';
  }

  const result = await callLlm([
    { role: 'system', content: system },
    ...history,
  ]);

  if (!result.ok) {
    console.error('[copilot] LLM error', result.status, result.detail);
    if (result.status === 429) {
      return Response.json(
        { error: 'Trop de requêtes sur le modèle gratuit. Réessayez dans quelques secondes.' },
        { status: 429 },
      );
    }
    return Response.json(
      { error: 'Le service IA est momentanément indisponible.' },
      { status: 502 },
    );
  }

  const upstream = result.res;

  // Re-stream OpenRouter SSE → plain text deltas the client appends.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // partial JSON across chunks — ignore, it will complete next loop
            }
          }
        }
      } catch (err) {
        console.error('[copilot] stream error', err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
