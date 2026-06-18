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
const MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free';

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

  const body = (await request.json()) as { messages?: ChatMessage[] };
  const history = (body.messages ?? [])
    .filter((m) => m.content?.trim())
    .slice(-MAX_HISTORY);

  if (history.length === 0) {
    return Response.json({ error: 'Aucun message.' }, { status: 400 });
  }

  const system = await buildCopilotSystemPrompt();

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'VendorShield Copilot',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.4,
      max_tokens: 800,
      messages: [{ role: 'system', content: system }, ...history],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('[copilot] OpenRouter error', upstream.status, detail);
    return Response.json(
      { error: 'Le service IA est momentanément indisponible.' },
      { status: 502 },
    );
  }

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
