import { Check, ShieldAlert, X } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import type { CyberPosture } from '~/lib/vendorshield/cyber.server';

const LEVEL_META: Record<string, { label: string; cls: string }> = {
  low: { label: 'Risque faible', cls: 'bg-green-100 text-green-800' },
  medium: { label: 'Risque modéré', cls: 'bg-amber-100 text-amber-800' },
  high: { label: 'Risque élevé', cls: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Risque critique', cls: 'bg-red-100 text-red-800' },
};

export function CyberPosturePanel({ posture }: { posture: CyberPosture }) {
  const meta = LEVEL_META[posture.level] ?? LEVEL_META.medium!;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="text-primary h-4 w-4" />
            Posture cyber
          </CardTitle>
          {posture.has_data && <Badge className={meta.cls}>{meta.label}</Badge>}
        </div>
        <CardDescription className="text-xs">
          Dérivée de l&apos;ISO 27001 et du questionnaire d&apos;auto-évaluation.
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
                <span className={s.ok ? '' : 'text-muted-foreground'}>{s.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucun signal cyber. Envoyez un questionnaire ou ajoutez une certification ISO 27001.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
