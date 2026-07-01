'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import { Loader2, Sparkles, Network } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

import { CopilotMarkdown } from '~/home/_components/copilot-markdown';
import { sourcingAdviceAction } from '~/lib/vendorshield/actions/sourcing.actions';
import type { MultiSourcingResult } from '~/lib/vendorshield/multi-sourcing.server';

const LEVEL_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  medium: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function MultiSourcingPanel({ data }: { data: MultiSourcingResult }) {
  const { t, i18n } = useTranslation('vendorshield');
  const [advice, setAdvice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eur = (n: number) =>
    new Intl.NumberFormat(i18n.language, { notation: 'compact', style: 'currency', currency: 'EUR' }).format(n);

  const ACTION_LABEL: Record<string, string> = {
    qualify_second_source: t('exposure.qualifySecondSource'),
    diversify: t('exposure.diversify'),
    monitor: t('exposure.monitor'),
  };

  const generate = () =>
    startTransition(async () => {
      const res = await sourcingAdviceAction();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setAdvice(res.advice);
    });

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4" /> Multi-sourcing & diversification
            </CardTitle>
            <CardDescription>
              {data.count > 0
                ? t('exposure.dependencyCount', { count: data.count, spend: eur(data.exposed_spend) })
                : t('exposure.noCritical')}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={generate} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {t('exposure.aiAdvice')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {advice && (
          <div className="bg-primary/5 border-primary/20 rounded-lg border p-3">
            <CopilotMarkdown text={advice} />
          </div>
        )}

        {data.count === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('exposure.wellDiversified')}
          </p>
        ) : (
          <ul className="space-y-2">
            {data.recommendations.slice(0, 12).map((r) => (
              <li key={r.supplier_id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/home/suppliers/${r.supplier_id}`}
                    className="font-medium hover:underline"
                  >
                    {r.supplier_name}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {r.is_sole_source && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        {t('exposure.monoSource')}
                      </span>
                    )}
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${LEVEL_BADGE[r.level]}`}>
                      {ACTION_LABEL[r.action]}
                    </span>
                    <span className="text-muted-foreground text-xs">{eur(r.spend)}</span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{r.rationale}</p>
                {r.alternatives.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-muted-foreground">{t('exposure.alternatives')}</span>
                    {r.alternatives.map((a) => (
                      <Link
                        key={a.id}
                        href={`/home/suppliers/${a.id}`}
                        className="hover:bg-muted rounded border px-1.5 py-0.5"
                      >
                        {a.name}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
