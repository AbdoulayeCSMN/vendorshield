'use client';

import Link from 'next/link';

import { AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { useTranslation } from 'react-i18next';

import type { RiskLevel, SupplierRiskSummary } from '~/lib/vendorshield/types';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';

interface Props {
  suppliers: SupplierRiskSummary[];
}

function RiskBadge({ level }: { level: RiskLevel | null }) {
  const { riskLevelLabels } = useEnumLabels();
  if (!level) return null;
  const cfg = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    high:     'text-orange-700 bg-orange-50 border-orange-200',
    medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
    low:      'text-green-700 bg-green-50 border-green-200',
  } as const;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg[level]}`}>
      {riskLevelLabels[level]}
    </span>
  );
}

export function TopRiskyTable({ suppliers }: Props) {
  const { t } = useTranslation('vendorshield');
  const { categoryLabels } = useEnumLabels();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <CardTitle className="text-sm font-semibold">{t('dashboard.topRisky')}</CardTitle>
        </div>
        <CardDescription>Classés par score global croissant (risque le plus élevé en premier)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {suppliers.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400 px-6">
            Aucun fournisseur évalué pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {suppliers.map((s, i) => (
              <Link
                key={s.id}
                href={`/home/suppliers/${s.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                {/* Rang */}
                <span className={`w-5 shrink-0 text-center text-xs font-bold tabular-nums ${
                  i < 3 ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {i + 1}
                </span>

                {/* Drapeau */}
                <span className="text-lg shrink-0">
                  {s.country_code ? countryFlag(s.country_code) : '🏢'}
                </span>

                {/* Nom + catégorie */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {s.name}
                    {s.is_sole_source && (
                      <span className="ml-1.5 text-[10px] text-amber-600 font-medium">●</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {categoryLabels[s.category]}
                    {s.open_alerts > 0 && (
                      <span className="ml-2 text-red-500">
                        · {s.open_alerts} alerte{s.open_alerts > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>

                {/* Score + niveau */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className={`text-base font-bold tabular-nums ${
                      s.global_score === null ? 'text-gray-400'
                      : s.global_score < 20 ? 'text-red-700 font-extrabold'
                      : s.global_score < 40 ? 'text-red-600'
                      : s.global_score < 70 ? 'text-orange-600'
                      : 'text-green-600'
                    }`}>
                      {s.global_score ?? '—'}
                    </span>
                    <span className="text-[10px] text-gray-400">/100</span>
                  </div>
                  <RiskBadge level={s.risk_level} />
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function countryFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join('');
}
