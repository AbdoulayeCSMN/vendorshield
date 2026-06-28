'use client';

import { useState } from 'react';

import { Check, Copy } from 'lucide-react';

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      <span className="min-w-0">
        <span className="text-muted-foreground block text-xs">{label}</span>
        <span className="block truncate font-mono text-sm">{value}</span>
      </span>
      {copied ? (
        <Check className="h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <Copy className="text-muted-foreground h-4 w-4 shrink-0" />
      )}
    </button>
  );
}
