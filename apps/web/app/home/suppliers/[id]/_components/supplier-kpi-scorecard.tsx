import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PieChart,
  Wallet,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import type { SupplierKpis } from '~/lib/vendorshield/kpis.server';

function pctColor(v: number | null, good = 90, mid = 75): string {
  if (v === null) return 'text-muted-foreground';
  if (v >= good) return 'text-green-600';
  if (v >= mid) return 'text-amber-600';
  return 'text-red-600';
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value}</div>
      {hint && <div className="text-muted-foreground text-[11px]">{hint}</div>}
    </div>
  );
}

export function SupplierKpiScorecard({ kpis }: { kpis: SupplierKpis }) {
  const fmtPct = (v: number | null) => (v === null ? '—' : `${v}%`);

  // Dépendance : plus la part de dépense est élevée, plus le risque de
  // concentration est fort (rouge au-delà de 20 %).
  const depColor =
    kpis.spend_share === null
      ? 'text-muted-foreground'
      : kpis.spend_share >= 20
        ? 'text-red-600'
        : kpis.spend_share >= 10
          ? 'text-amber-600'
          : 'text-green-600';

  const incColor =
    kpis.incident_count === 0
      ? 'text-green-600'
      : kpis.incident_count <= 2
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Scorecard de performance</CardTitle>
        <CardDescription className="text-xs">
          {kpis.deliveries_count > 0
            ? `Sur ${kpis.deliveries_count} livraisons enregistrées`
            : 'Importez un historique de livraisons pour activer les KPIs opérationnels'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile
            icon={Clock}
            label="Ponctualité"
            value={fmtPct(kpis.otd_rate)}
            hint="livraisons à l'heure"
            color={pctColor(kpis.otd_rate)}
          />
          <Tile
            icon={CheckCircle2}
            label="Conformité"
            value={fmtPct(kpis.conformity_rate)}
            hint="qualité sous seuil"
            color={pctColor(kpis.conformity_rate)}
          />
          <Tile
            icon={AlertTriangle}
            label="Incidents"
            value={String(kpis.incident_count)}
            hint="alertes ouvertes"
            color={incColor}
          />
          <Tile
            icon={Wallet}
            label="Score financier"
            value={kpis.financial_score === null ? '—' : `${kpis.financial_score}`}
            hint="/100"
            color={pctColor(kpis.financial_score, 70, 45)}
          />
          <Tile
            icon={PieChart}
            label="Dépendance"
            value={kpis.spend_share === null ? '—' : `${kpis.spend_share}%`}
            hint="de la dépense"
            color={depColor}
          />
        </div>
      </CardContent>
    </Card>
  );
}
