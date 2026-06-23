'use client';

const GENERAL: string[] = [
  'Quels fournisseurs sont les plus à risque ?',
  'Résume mes alertes ouvertes',
  'Quelle est mon exposition (Spend-at-Risk) ?',
  'Quels fournisseurs sont en mono-source ?',
  'Quels documents de conformité me manquent ?',
  'Quels fournisseurs ont une prédiction de retard ?',
  'Comment importer mes fournisseurs ?',
  'Explique le score de fiabilité sur 24 critères',
];

const SUPPLIER: string[] = [
  'Analyse ce fournisseur et ses risques',
  'Que faire pour réduire son risque ?',
  'Explique sa prédiction de retard et de défauts',
  'Quels documents de conformité lui manquent ?',
  "Génère un plan d'action pour ce fournisseur",
];

export function suggestionsFor(supplierId?: string): string[] {
  return supplierId ? [...SUPPLIER, ...GENERAL.slice(0, 2)] : GENERAL;
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
  return (
    <div className="flex flex-col gap-2">
      {suggestionsFor(supplierId)
        .slice(0, limit)
        .map((s) => (
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
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {suggestionsFor(supplierId)
        .slice(0, limit)
        .map((s) => (
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
