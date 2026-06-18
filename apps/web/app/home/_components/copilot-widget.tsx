'use client';

import { Fragment, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Loader2, Send, Sparkles, X } from 'lucide-react';

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

// Rendu léger : liens markdown [label](href) + sauts de ligne, sans dépendance.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (m) {
          const [, label, href] = m;
          return href!.startsWith('/') ? (
            <Link key={i} href={href!} className="text-primary underline">
              {label}
            </Link>
          ) : (
            <a key={i} href={href!} className="text-primary underline" target="_blank" rel="noreferrer">
              {label}
            </a>
          );
        }
        return (
          <Fragment key={i}>
            {part.split('\n').map((line, j, arr) => (
              <Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </>
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const next: Message[] = [...messages, { role: 'user', content }];
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
                  <RichText text={m.content} />
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
