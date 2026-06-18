'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Loader2, Send, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@kit/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const BASE_SUGGESTIONS = [
  'Quels fournisseurs sont les plus à risque ?',
  'Résume mes alertes ouvertes',
  'Comment importer mes fournisseurs ?',
  'Explique-moi le score de risque',
];

const SUPPLIER_SUGGESTIONS = [
  'Analyse ce fournisseur et ses risques',
  'Que faire pour réduire son risque ?',
  'Explique sa prédiction de retard',
];

/** Ouvre le copilote et lui pose une question depuis n'importe quel composant. */
export function askCopilot(message: string): void {
  window.dispatchEvent(
    new CustomEvent('vendorshield:copilot-ask', { detail: { message } }),
  );
}

// Rendu Markdown complet (GFM : tableaux, listes, gras…), stylé pour le chat.
function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith('/') ? (
              <Link href={href} className="text-primary underline">
                {children}
              </Link>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                {children}
              </a>
            ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-0.5 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-0.5 pl-4">{children}</ol>,
          h1: ({ children }) => <p className="text-sm font-semibold">{children}</p>,
          h2: ({ children }) => <p className="text-sm font-semibold">{children}</p>,
          h3: ({ children }) => <p className="font-semibold">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ children }) => (
            <code className="bg-muted rounded px-1 py-0.5 text-[11px]">{children}</code>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border px-2 py-1 align-top">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function CopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const supplierId = pathname?.match(
    /^\/home\/suppliers\/([0-9a-f]{8}-[0-9a-f-]{27})/i,
  )?.[1];
  const suggestions = supplierId
    ? [...SUPPLIER_SUGGESTIONS, ...BASE_SUGGESTIONS.slice(0, 1)]
    : BASE_SUGGESTIONS;

  // Évite les closures périmées quand send() est déclenché par un événement.
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const next: Message[] = [...messagesRef.current, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    // Placeholder assistant message we stream into.
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context: { supplierId } }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? 'Erreur du copilote');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: copy[copy.length - 1]!.content + chunk,
          };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: `⚠️ ${(e as Error).message}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  // Permet à d'autres composants (ex: panneau de prédiction) d'ouvrir le
  // copilote et de poser une question via un événement custom.
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message?: string }>).detail?.message;
      setOpen(true);
      if (msg) void sendRef.current(msg);
    };
    window.addEventListener('vendorshield:copilot-ask', handler);
    return () => window.removeEventListener('vendorshield:copilot-ask', handler);
  }, []);

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le copilote"
          className="bg-primary text-primary-foreground fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panneau de chat */}
      {open && (
        <div className="bg-background fixed bottom-5 right-5 z-50 flex h-[560px] max-h-[80vh] w-[min(420px,calc(100vw-2.5rem))] flex-col rounded-xl border shadow-2xl">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary h-4 w-4" />
              <span className="text-sm font-semibold">Copilote VendorShield</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="text-muted-foreground space-y-3 text-sm">
                <p>Posez une question sur vos fournisseurs, vos risques ou l'utilisation de l'application.</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="hover:bg-muted rounded-lg border px-3 py-2 text-left text-xs transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                }`}
              >
                {m.content ? (
                  <Markdown text={m.content} />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question..."
              className="border-input bg-background focus-visible:ring-ring flex-1 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
            />
            <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
