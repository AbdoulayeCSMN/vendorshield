import Link from 'next/link';

import { AlertTriangle, ArrowUpRight, GitBranch, Layers, Shield } from 'lucide-react';

import { PageBody, PageHeader } from '@kit/ui/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

import { withI18n } from '~/lib/i18n/with-i18n';
import { getSupplyChainOverview } from '~/lib/vendorshield/actions/tier.actions';
import { getSuppliers } from '~/lib/vendorshield/suppliers.server';

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-700 bg-red-50 border-red-200',
  high:     'text-orange-700 bg-orange-50 border-orange-200',
  medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
  low:      'text-green-700 bg-green-50 border-green-200',
  unknown:  'text-gray-600 bg-gray-50 border-gray-200',
};

async function SupplyChainPage() {
  const [overview, { suppliers }] = await Promise.all([
    getSupplyChainOverview(),
    getSuppliers({ limit: 50, sort: 'global_score', order: 'asc' }),
  ]);

  // Fournisseurs avec tiers enrichis (pour afficher un badge)
  const suppliersWithTiers = suppliers.filter(s =>
    // On ne peut pas le savoir sans requête supplémentaire — on affiche tous
    true
  );

  return (
    <>
      <PageHeader
        title="Supply Chain Graph"
        description="Cartographie multi-tiers de votre chaîne d'approvisionnement"
      />
      <PageBody>
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Fournisseurs Tier 1', value: overview.total_tier1, icon: Shield, color: 'bg-blue-50 text-blue-600' },
              { label: 'Nœuds Tier 2 (IA)', value: overview.total_tier2, icon: Layers, color: 'bg-violet-50 text-violet-600' },
              { label: 'Nœuds Tier 3 (IA)', value: overview.total_tier3, icon: GitBranch, color: 'bg-purple-50 text-purple-600' },
              { label: 'Risques critiques', value: overview.critical_tiers.length, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${color}`}><Icon className="h-5 w-5" /></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Risques critiques détectés */}
            {overview.critical_tiers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Nœuds à risque élevé détectés
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Fournisseurs Tier 2/3 inférés par IA avec risque critique ou élevé
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overview.critical_tiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                        <p className="text-[10px] text-gray-400">
                          Tier {t.tier_level} de {t.supplier_name}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium rounded-full border px-2 py-0.5 ${RISK_COLORS[t.estimated_risk_level] ?? RISK_COLORS.unknown}`}>
                        {t.estimated_risk_level}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Liste fournisseurs avec lien vers leur graph */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Cartographier un fournisseur</CardTitle>
                <CardDescription className="text-xs">
                  Cliquez sur un fournisseur pour voir ou générer ses tiers IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {suppliersWithTiers.slice(0, 12).map(s => (
                  <Link key={s.id} href={`/home/suppliers/${s.id}#supply-chain`}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                        {s.country_code && (
                          <span className="mr-1">
                            {s.country_code.trim().toUpperCase().split('').map(c =>
                              String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')}
                          </span>
                        )}
                        {s.name}
                      </p>
                      <p className="text-[9px] text-gray-400">{s.category}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary shrink-0" />
                  </Link>
                ))}
                {suppliersWithTiers.length > 12 && (
                  <Link href="/home/suppliers" className="text-xs text-primary hover:underline block text-center pt-1">
                    Voir tous les fournisseurs →
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Explication du modèle */}
          <Card className="border-violet-200 dark:border-violet-900 bg-violet-50/30 dark:bg-violet-950/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <GitBranch className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p className="font-medium text-gray-800 dark:text-gray-200">Comment fonctionne le graph multi-tiers ?</p>
                  <p>
                    <strong>Tier 1</strong> = vos fournisseurs directs (données réelles Avilyre).
                  </p>
                  <p>
                    <strong>Tier 2/3</strong> = fournisseurs probables inférés par IA (Groq Llama 3.3) basés sur
                    le secteur d'activité et le pays du Tier 1. Ces nœuds sont des estimations — non des données réelles.
                  </p>
                  <p>
                    La <strong>couleur</strong> indique le risque estimé (vert=faible, orange=modéré, rouge=élevé/critique).
                    Le <strong>contour doré</strong> signale un sole source probable.
                    Cliquez sur un nœud pour voir les détails et la justification IA.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(SupplyChainPage);
