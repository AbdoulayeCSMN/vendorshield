'use client';

import { useEffect, useMemo, useState } from 'react';

import { Loader2, Sparkles } from 'lucide-react';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { suggestColumnMappingAction } from '~/lib/vendorshield/actions/import-mapping.actions';
import { fieldsFor } from '~/lib/vendorshield/import-fields';

interface ColumnMappingProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  importType: 'suppliers' | 'deliveries';
  onComplete: (mapping: Record<string, string>) => void;
}

export function ColumnMapping({ rows, importType, onComplete }: ColumnMappingProps) {
  const { t } = useTranslation('vendorshield');
  const headers = useMemo(
    () => (rows.length ? Object.keys(rows[0]).filter((h) => h !== 'row_number') : []),
    [rows],
  );
  const fields = fieldsFor(importType);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [aiSuggested, setAiSuggested] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    suggestColumnMappingAction({ headers, sampleRows: rows.slice(0, 5), importType })
      .then((res) => {
        if (!active) return;
        if (res.success) {
          setMapping(res.mapping);
          setAiSuggested(res.source === 'llm');
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers.join('|'), importType]);

  const setField = (key: string, src: string) =>
    setMapping((m) => {
      const c = { ...m };
      if (src) c[key] = src;
      else delete c[key];
      return c;
    });

  const missingRequired = fields.filter((f) => f.required && !mapping[f.key]);

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> {t('imports.aiDetecting')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {t('imports.mapDesc')}
        </p>
        {aiSuggested && (
          <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" /> {t('imports.aiPrefilled')}
          </span>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center gap-3 px-3 py-2">
            <div className="w-1/2 min-w-0">
              <span className="text-sm font-medium">{f.label}</span>
              {f.required && <span className="ml-1 text-red-500">*</span>}
            </div>
            <select
              value={mapping[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
              className={`border-input bg-background h-8 flex-1 rounded-md border px-2 text-sm ${
                f.required && !mapping[f.key] ? 'border-red-300' : ''
              }`}
            >
              <option value="">{t('imports.ignore')}</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {missingRequired.length > 0 && (
        <p className="text-xs text-red-600">
          {t('imports.requiredUnmapped', { fields: missingRequired.map((f) => f.label).join(', ') })}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={() => onComplete(mapping)} disabled={missingRequired.length > 0}>
          {t('imports.continue')}
        </Button>
      </div>
    </div>
  );
}
