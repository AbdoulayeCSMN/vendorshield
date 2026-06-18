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

// Chaîne de modèles : OpenRouter bascule automatiquement sur le suivant si le
// premier est saturé (429) ou indisponible. Tous gratuits par défaut ;
// surchargeable via OPENROUTER_MODELS (liste séparée par des virgules).
// Chaîne de repli de modèles gratuits réellement disponibles (vérifiés en live).
// OpenRouter route sur le suivant si un provider est saturé/indispo.
// OpenRouter limite le tableau `models` à 3 éléments max → on tronque par sécurité.
const MODELS = (
  process.env.OPENROUTER_MODELS ??
  process.env.OPENROUTER_MODEL ??
  [
    'openai/gpt-oss-120b:free',
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
  ].join(',')
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
  .slice(0, 3);

async function callOpenRouter(
  apiKey: string,
  messages: { role: string; content: string }[],
): Promise<{ ok: true; res: Response } | { ok: false; status: number; detail: string }> {
  const payload = JSON.stringify({
    ...(MODELS.length > 1 ? { models: MODELS } : { model: MODELS[0] }),
    stream: true,
    temperature: 0.4,
    max_tokens: 800,
    messages,
  });

  // Une seule tentative côté 429 : la limite du tier gratuit est partagée et ne
  // se recharge pas en quelques secondes — retenter ne ferait qu'allonger
  // l'attente. On échoue vite et on laisse l'utilisateur réessayer.
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'VendorShield Copilot',
    },
    body: payload,
  });

  if (res.ok && res.body) return { ok: true, res };

  const detail = await res.text().catch(() => '');
  return { ok: false, status: res.status, detail };
}

export async function POST(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Copilote indisponible : OPENROUTER_API_KEY n'est pas configurée." },
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

  const system = await buildCopilotSystemPrompt(supplierId);

  const result = await callOpenRouter(apiKey, [
    { role: 'system', content: system },
    ...history,
  ]);

  if (!result.ok) {
    console.error('[copilot] OpenRouter error', result.status, result.detail);
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
