'use client';

import { useEffect, useRef, useState } from 'react';

import { Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';

import { Button } from '@kit/ui/button';

import { useTranslation } from 'react-i18next';

import { CopilotMarkdown } from '~/home/_components/copilot-markdown';
import { SuggestionChips, SuggestionList } from '~/home/_components/copilot-suggestions';
import { useCopilotChat } from '~/home/_components/use-copilot-chat';

export function CopilotChat() {
  const { t } = useTranslation('vendorshield');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, streaming, supplierId, send, clear } = useCopilotChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = (text: string) => {
    void send(text);
    setInput('');
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-3xl flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xl text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Sparkles className="text-primary h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">{t('copilot.welcomeTitle')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('copilot.welcomeDesc')}
            </p>
            <div className="mx-auto mt-6 max-w-md">
              <SuggestionList supplierId={supplierId} onPick={submit} limit={6} />
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'
              }`}
            >
              {m.content ? <CopilotMarkdown text={m.content} /> : <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          ))
        )}
      </div>

      {messages.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <SuggestionChips supplierId={supplierId} onPick={submit} limit={5} />
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="shrink-0">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t('copilot.newConversation')}
          </Button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('copilot.placeholder')}
          className="border-input bg-background focus-visible:ring-ring flex-1 rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1"
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
