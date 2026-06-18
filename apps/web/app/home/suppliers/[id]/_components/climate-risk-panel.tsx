'use client';

import { useEffect, useState } from 'react';

import {
  CloudRain,
  CloudSun,
  Loader2,
  Snowflake,
  Thermometer,
  Wind,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import {
  type ClimateAssessment,
  type ClimateHazard,
} from '~/lib/vendorshield/climate.server';
import { assessSupplierClimateAction } from '~/lib/vendorshield/actions/climate.actions';

const RISK_META: Record<string, { label: string; cls: string }> = {
  low: { label: 'Faible', cls: 'bg-green-100 text-green-800' },
  medium: { label: 'Modéré', cls: 'bg-amber-100 text-amber-800' },
  high: { label: 'Élevé', cls: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critique', cls: 'bg-red-100 text-red-800' },
};

const HAZARD_ICON: Record<ClimateHazard['type'], React.ComponentType<{ className?: string }>> = {
  flood: CloudRain,
  heat: Thermometer,
  cold: Snowflake,
  storm: Wind,
};

export function ClimateRiskPanel({ supplierId }: { supplierId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClimateAssessment | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    assessSupplierClimateAction(supplierId)
      .then((res) => {
        if (!active) return;
        if (res.success) setData(res.data);
        else setError(res.error);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [supplierId]);

  const risk = data ? RISK_META[data.level] ?? RISK_META.low! : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CloudSun className="text-primary h-4 w-4" />
            Risque climatique
          </CardTitle>
          {risk && <Badge className={risk.cls}>{risk.label}</Badge>}
        </div>
        <CardDescription className="text-xs">
          Prévisions Open-Meteo · {data ? `horizon ${data.horizon_days} j` : 'aléas à venir'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse météo...
          </div>
        ) : error ? (
          <p className="text-muted-foreground text-sm">{error}</p>
        ) : data ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-xs">{data.location}</span>
              <span className="text-lg font-bold">{data.score}/100</span>
            </div>

            {data.hazards.length ? (
              <ul className="space-y-1.5">
                {data.hazards.map((h, i) => {
                  const Icon = HAZARD_ICON[h.type];
                  return (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <Icon
                        className={`h-4 w-4 ${h.severity === 'severe' ? 'text-red-500' : 'text-amber-500'}`}
                      />
                      <span className="font-medium">{h.label}</span>
                      <span className="text-muted-foreground">— {h.peak}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                Aucun aléa climatique significatif détecté sur les {data.horizon_days} prochains jours.
              </p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
