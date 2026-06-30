'use client';

import { useRef, useState } from 'react';

import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { commitSupplierDeliveryHistoryAction } from '~/lib/vendorshield/actions/import.actions';

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? '').split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() ?? '';
    });
    return row;
  });
}

function guessMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const key of headers) {
    const lower = key.toLowerCase();

    if (!mapping.date_prévue && (lower.includes('date_prev') || lower.includes('planned') || lower.includes('schedule'))) {
      mapping.date_prévue = key;
    } else if (!mapping.date_réelle && (lower.includes('date_real') || lower.includes('actual'))) {
      mapping.date_réelle = key;
    } else if (!mapping.ppm_value && lower.includes('ppm')) {
      mapping.ppm_value = key;
    } else if (!mapping.quantité && (lower.includes('qty') || lower.includes('quant'))) {
      mapping.quantité = key;
    } else if (!mapping.statut && (lower.includes('status') || lower.includes('statut'))) {
      mapping.statut = key;
    }
  }

  return mapping;
}

export function SupplierDeliveryUpload({
  supplierId,
  onImported,
}: {
  supplierId: string;
  onImported?: () => void;
}) {
  const { t } = useTranslation('vendorshield');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);

  const handleFile = async (file: File) => {
    setIsPending(true);

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      if (rows.length === 0) {
        toast.error(t('prediction.uploadInvalidFile'));
        return;
      }

      const mapping = guessMapping(Object.keys(rows[0]!));

      if (!mapping.date_prévue && !mapping.date_réelle) {
        toast.error(t('prediction.uploadUnrecognizedColumns'));
        return;
      }

      const result = await commitSupplierDeliveryHistoryAction(supplierId, {
        rows,
        columnMapping: mapping,
        filename: file.name,
        fileType: 'csv',
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t('prediction.uploadSuccess', { count: result.data.imported }));
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('prediction.uploadFailed'));
    } finally {
      setIsPending(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        disabled={isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('prediction.uploadImporting')}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" /> {t('prediction.uploadCta')}
          </>
        )}
      </Button>
      <p className="text-muted-foreground text-[11px]">{t('prediction.uploadHint')}</p>
    </div>
  );
}
