'use client';

import Link from 'next/link';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Rendu Markdown complet (GFM : tableaux, listes, gras…), stylé pour le chat.
export function CopilotMarkdown({ text }: { text: string }) {
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
              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
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
