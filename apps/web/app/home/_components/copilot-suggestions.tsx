'use client';

import { useTranslation } from 'react-i18next';

function useSuggestions(supplierId?: string): string[] {
  const { t } = useTranslation('vendorshield');
  const general = [
    t('copilot.sg0'), t('copilot.sg1'), t('copilot.sg2'), t('copilot.sg3'),
    t('copilot.sg4'), t('copilot.sg5'), t('copilot.sg6'), t('copilot.sg7'),
  ];
  const supplier = [
    t('copilot.ss0'), t('copilot.ss1'), t('copilot.ss2'),
    t('copilot.ss3'), t('copilot.ss4'),
  ];
  return supplierId ? [...supplier, ...general.slice(0, 2)] : general;
}

/** Liste verticale (état d'accueil). */
export function SuggestionList({
  supplierId,
  onPick,
  limit = 6,
}: {
  supplierId?: string;
  onPick: (s: string) => void;
  limit?: number;
}) {
  const suggestions = useSuggestions(supplierId);
  return (
    <div className="flex flex-col gap-2">
      {suggestions.slice(0, limit).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="hover:bg-muted rounded-lg border px-3 py-2 text-left text-xs transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/** Rangée horizontale de chips, toujours visible au-dessus de la saisie. */
export function SuggestionChips({
  supplierId,
  onPick,
  limit = 4,
}: {
  supplierId?: string;
  onPick: (s: string) => void;
  limit?: number;
}) {
  const suggestions = useSuggestions(supplierId);
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {suggestions.slice(0, limit).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="border-input hover:bg-muted shrink-0 rounded-full border px-3 py-1 text-[11px] whitespace-nowrap transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
