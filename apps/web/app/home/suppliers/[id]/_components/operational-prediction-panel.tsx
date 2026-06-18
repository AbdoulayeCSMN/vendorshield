'use client';

import { useState, useTransition } from 'react';

import { Activity, Clock, Loader2, PackageX, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

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

const RISK_META: Record<string, { label: string; cls: string }> = {
  low: { label: 'Risque faible', cls: 'bg-green-100 text-green-800' },
  medium: { label: 'Risque modéré', cls: 'bg-amber-100 text-amber-800' },
  high: { label: 'Risque élevé', cls: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Risque critique', cls: 'bg-red-100 text-red-800' },
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
      toast.success('Prédiction mise à jour');
    });
  };

  const risk = prediction ? RISK_META[prediction.risk_level] ?? RISK_META.low! : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="text-primary h-4 w-4" />
            Prédictions opérationnelles
          </CardTitle>
          {risk && <Badge className={risk.cls}>{risk.label}</Badge>}
        </div>
        <CardDescription className="text-xs">
          Modèle ML entraîné sur l'historique de livraisons · explication IA
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!prediction ? (
          <p className="text-muted-foreground text-sm">
            Aucune prédiction encore. Lancez l'analyse à partir de l'historique importé.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" /> Retard prochaine livraison
                </div>
                <div className={`mt-1 text-2xl font-bold ${pctColor(prediction.delay_probability)}`}>
                  {prediction.delay_probability}%
                </div>
                <div className="text-muted-foreground text-xs">
                  ≈ {prediction.expected_delay_days} j attendus
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <PackageX className="h-3.5 w-3.5" /> Défauts (PPM) prévus
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {prediction.predicted_ppm ?? '—'}
                </div>
                <div className={`text-xs ${pctColor(prediction.ppm_breach_probability)}`}>
                  dépassement seuil : {prediction.ppm_breach_probability}%
                </div>
              </div>
            </div>

            {prediction.explanation && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed">
                <div className="text-muted-foreground mb-1 flex items-center gap-1.5 font-medium">
                  <TrendingUp className="h-3.5 w-3.5" /> Analyse
                </div>
                {prediction.explanation}
              </div>
            )}

            <div className="text-muted-foreground flex items-center justify-between text-[11px]">
              <span>
                {prediction.data_points} livraisons · confiance {prediction.confidence}%
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calcul du modèle...
              </>
            ) : prediction ? (
              'Recalculer'
            ) : (
              'Lancer la prédiction'
            )}
          </Button>
          {prediction && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() =>
                askCopilot(
                  'Explique la prédiction opérationnelle de ce fournisseur (retard et défauts) et donne 2 actions concrètes pour réduire le risque.',
                )
              }
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Demander au copilote
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
