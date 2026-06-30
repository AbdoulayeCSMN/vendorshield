'use client';

import { useState, useTransition } from 'react';

import { Activity, Clock, Loader2, PackageX, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { askCopilot } from '~/home/_components/copilot-widget';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import {
  type OperationalPrediction,
  predictOperationalRiskAction,
} from '~/lib/vendorshield/actions/operational-prediction.actions';

import { SupplierDeliveryUpload } from './supplier-delivery-upload';

const RISK_CLS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};
const RISK_FULL: Record<string, string> = {
  low: 'riskLowFull', medium: 'riskMediumFull', high: 'riskHighFull', critical: 'riskCriticalFull',
};

function pctColor(p: number): string {
  if (p >= 70) return 'text-red-600';
  if (p >= 45) return 'text-orange-600';
  if (p >= 25) return 'text-amber-600';
  return 'text-green-600';
}

export function OperationalPredictionPanel({
  supplierId,
  initial,
}: {
  supplierId: string;
  initial: OperationalPrediction | null;
}) {
  const { t } = useTranslation('vendorshield');
  const [prediction, setPrediction] = useState<OperationalPrediction | null>(initial);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const res = await predictOperationalRiskAction(supplierId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setPrediction(res.data);
      toast.success(t('prediction.updated'));
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="text-primary h-4 w-4" />
            {t('prediction.title')}
          </CardTitle>
          {prediction && (
            <Badge className={RISK_CLS[prediction.risk_level] ?? RISK_CLS.low!}>
              {t(`dashboard.${RISK_FULL[prediction.risk_level] ?? 'riskLowFull'}`)}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {t('prediction.desc')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!prediction ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {t('prediction.empty')}
            </p>
            <SupplierDeliveryUpload supplierId={supplierId} onImported={run} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" /> {t('prediction.nextDelay')}
                </div>
                <div className={`mt-1 text-2xl font-bold ${pctColor(prediction.delay_probability)}`}>
                  {prediction.delay_probability}%
                </div>
                <div className="text-muted-foreground text-xs">
                  {t('prediction.expectedDays', { days: prediction.expected_delay_days })}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <PackageX className="h-3.5 w-3.5" /> {t('prediction.predictedPpm')}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {prediction.predicted_ppm ?? '—'}
                </div>
                <div className={`text-xs ${pctColor(prediction.ppm_breach_probability)}`}>
                  {t('prediction.breach', { pct: prediction.ppm_breach_probability })}
                </div>
              </div>
            </div>

            {prediction.explanation && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed">
                <div className="text-muted-foreground mb-1 flex items-center gap-1.5 font-medium">
                  <TrendingUp className="h-3.5 w-3.5" /> {t('prediction.analysis')}
                </div>
                {prediction.explanation}
              </div>
            )}

            <div className="text-muted-foreground flex items-center justify-between text-[11px]">
              <span>
                {t('prediction.dataPoints', { count: prediction.data_points, conf: prediction.confidence })}
              </span>
              <span>{prediction.model_version}</span>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button
            onClick={run}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('prediction.computing')}
              </>
            ) : prediction ? (
              t('prediction.recompute')
            ) : (
              t('prediction.launch')
            )}
          </Button>
          {prediction && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => askCopilot(t('prediction.copilotPrompt'))}
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> {t('prediction.askCopilot')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
