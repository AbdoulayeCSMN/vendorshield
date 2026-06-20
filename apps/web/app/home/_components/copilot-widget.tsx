'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Loader2, Maximize2, RotateCcw, Send, Sparkles, X } from 'lucide-react';

import { Button } from '@kit/ui/button';

import { CopilotMarkdown } from './copilot-markdown';
import { SuggestionChips, SuggestionList } from './copilot-suggestions';
import { useCopilotChat } from './use-copilot-chat';

/** Ouvre le copilote et lui pose une question depuis n'importe quel composant. */
export function askCopilot(message: string): void {
  window.dispatchEvent(
    new CustomEvent('vendorshield:copilot-ask', { detail: { message } }),
  );
}

export function CopilotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, streaming, supplierId, send, clear } = useCopilotChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // Permet à d'autres composants d'ouvrir le copilote et de poser une question.
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

  // Strictement client + masqué sur la page dédiée (évite le doublon).
  if (!mounted || pathname === '/home/copilot') return null;

  const submit = (text: string) => {
    void send(text);
    setInput('');
  };

  return (
    <>
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

      {open && (
        <div className="bg-background fixed bottom-5 right-5 z-50 flex h-[560px] max-h-[80vh] w-[min(420px,calc(100vw-2.5rem))] flex-col rounded-xl border shadow-2xl">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary h-4 w-4" />
              <span className="text-sm font-semibold">Copilote VendorShield</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button type="button" onClick={clear} aria-label="Nouvelle conversation" title="Nouvelle conversation" className="text-muted-foreground hover:text-foreground p-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <Link href="/home/copilot" aria-label="Ouvrir en plein écran" title="Plein écran" className="text-muted-foreground hover:text-foreground p-1">
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="text-muted-foreground space-y-3 text-sm">
                <p>Posez une question sur vos fournisseurs, vos risques ou l'utilisation de l'application.</p>
                <SuggestionList supplierId={supplierId} onPick={submit} />
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'
                  }`}
                >
                  {m.content ? <CopilotMarkdown text={m.content} /> : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              ))
            )}
          </div>

          {/* Suggestions cliquables en permanence */}
          {messages.length > 0 && (
            <div className="border-t px-3 pt-2">
              <SuggestionChips supplierId={supplierId} onPick={submit} />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
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
