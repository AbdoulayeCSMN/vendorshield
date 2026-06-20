'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'vs-copilot-history';
const MAX_STORED = 40;

/**
 * Logique de chat du copilote, partagée entre le widget flottant et la page
 * dédiée. Persiste l'historique dans localStorage (les deux vues partagent la
 * même conversation après rechargement).
 */
export function useCopilotChat() {
  const pathname = usePathname();
  const supplierId = pathname?.match(
    /^\/home\/suppliers\/([0-9a-f]{8}-[0-9a-f-]{27})/i,
  )?.[1];

  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const messagesRef = useRef<CopilotMessage[]>(messages);
  messagesRef.current = messages;
  const streamingRef = useRef(false);

  // Restauration au montage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as CopilotMessage[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persistance à chaque changement (après hydratation).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      /* ignore (quota / mode privé) */
    }
  }, [messages, hydrated]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || streamingRef.current) return;

      const next: CopilotMessage[] = [
        ...messagesRef.current,
        { role: 'user', content },
      ];
      setMessages([...next, { role: 'assistant', content: '' }]);
      streamingRef.current = true;
      setStreaming(true);

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
        streamingRef.current = false;
        setStreaming(false);
      }
    },
    [supplierId],
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, streaming, hydrated, supplierId, send, clear };
}
