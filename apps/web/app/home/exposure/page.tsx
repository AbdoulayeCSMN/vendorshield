import Link from 'next/link';

import { AlertTriangle, Layers, PieChart, TrendingDown } from 'lucide-react';

import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { withI18n } from '~/lib/i18n/with-i18n';
import { getOrganizationExposure } from '~/lib/vendorshield/exposure.server';

import { ExposureSpendChart } from './_components/exposure-spend-chart';

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', style: 'currency', currency: 'EUR' }).format(n);

const CONC_LABEL: Record<string, { label: string; cls: string }> = {
  low: { label: 'Faible', cls: 'text-green-600' },
  moderate: { label: 'Modérée', cls: 'text-amber-600' },
  high: { label: 'Élevée', cls: 'text-red-600' },
};

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className={`mt-1 text-2xl font-bold ${valueClass ?? ''}`}>{value}</div>
        {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
      </CardContent>
    </Card>
  );
}

async function ExposurePage() {
  const e = await getOrganizationExposure();
  const conc = CONC_LABEL[e.concentration_level] ?? CONC_LABEL.low!;

  return (
    <>
      <PageHeader title="Exposition au risque" description={<AppBreadcrumbs />} />
      <PageBody>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile
            icon={TrendingDown}
            label="Spend-at-Risk"
            value={eur(e.spend_at_risk)}
            hint={`${e.sar_pct}% de la dépense (${eur(e.total_spend)})`}
            valueClass={e.sar_pct >= 30 ? 'text-red-600' : e.sar_pct >= 15 ? 'text-amber-600' : ''}
          />
          <Tile
            icon={PieChart}
            label="Concentration (HHI)"
            value={String(e.hhi)}
            hint={`Concentration ${conc.label.toLowerCase()}`}
            valueClass={conc.cls}
          />
          <Tile
            icon={Layers}
            label="Dépendance top 3"
            value={`${e.top3_share}%`}
            hint="de la dépense totale"
            valueClass={e.top3_share >= 50 ? 'text-red-600' : e.top3_share >= 30 ? 'text-amber-600' : ''}
          />
          <Tile
            icon={AlertTriangle}
            label="Mono-sources"
            value={String(e.sole_source_count)}
            hint={`${eur(e.sole_source_spend)} exposés`}
            valueClass={e.sole_source_count > 0 ? 'text-amber-600' : ''}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Répartition dépense par risque */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Dépense exposée par niveau de risque</CardTitle>
              <CardDescription>
                Répartition de la dépense annuelle ({e.supplier_count} fournisseurs actifs).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExposureSpendChart data={e.by_risk} />
            </CardContent>
          </Card>

          {/* Top contributeurs au SaR */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Principaux contributeurs</CardTitle>
              <CardDescription>Dépense × probabilité d&apos;incident.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {e.contributors.length === 0 && (
                  <li className="text-muted-foreground text-sm">Aucune donnée de dépense.</li>
                )}
                {e.contributors.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/home/suppliers/${c.id}`}
                      className="hover:bg-muted flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors"
                    >
                      <span className="min-w-0 truncate font-medium">{c.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {eur(c.sar)} <span className="opacity-60">SaR</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Stress-test */}
        <Card className="mt-6 border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stress-test — défaillance du top 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Si vos 3 plus gros fournisseurs venaient à défaillir simultanément,{' '}
              <strong>{e.top3_share}%</strong> de votre dépense annuelle (≈{' '}
              <strong>{eur((e.total_spend * e.top3_share) / 100)}</strong>) serait à sécuriser en urgence.
              {e.sole_source_count > 0 && (
                <>
                  {' '}
                  Dont <strong>{e.sole_source_count} mono-source(s)</strong> sans alternative immédiate.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

export default withI18n(ExposurePage);
