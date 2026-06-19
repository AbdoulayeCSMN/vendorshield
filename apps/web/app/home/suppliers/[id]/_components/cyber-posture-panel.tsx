'use client';

import { Check, ShieldAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import type { CyberPosture } from '~/lib/vendorshield/cyber.server';

const LEVEL_CLS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const LEVEL_KEY: Record<string, string> = {
  low: 'riskLowFull',
  medium: 'riskMediumFull',
  high: 'riskHighFull',
  critical: 'riskCriticalFull',
};

export function CyberPosturePanel({ posture }: { posture: CyberPosture }) {
  const { t } = useTranslation('vendorshield');
  const cls = LEVEL_CLS[posture.level] ?? LEVEL_CLS.medium!;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="text-primary h-4 w-4" />
            {t('cyber.title')}
          </CardTitle>
          {posture.has_data && <Badge className={cls}>{t(`dashboard.${LEVEL_KEY[posture.level] ?? 'riskMediumFull'}`)}</Badge>}
        </div>
        <CardDescription className="text-xs">
          {t('cyber.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {posture.has_data ? (
          <ul className="space-y-1.5">
            {posture.signals.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                {s.ok ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-red-500" />
                )}
                <span className={s.ok ? '' : 'text-muted-foreground'}>{t(`cyber.signal.${s.key}`)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t('cyber.noData')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
