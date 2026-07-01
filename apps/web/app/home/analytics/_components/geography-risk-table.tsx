'use client';

import { Globe } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { useTranslation } from 'react-i18next';

import type { GeoRiskEntry } from '~/lib/vendorshield/analytics.server';

interface Props {
  entries: GeoRiskEntry[];
}

export function GeographyRiskTable({ entries }: Props) {
  const { t } = useTranslation('vendorshield');
  const top = entries.slice(0, 10);
  const maxCount = Math.max(...entries.map((e) => e.supplier_count), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm font-semibold">{t('dashboard.geoExposure')}</CardTitle>
        </div>
        <CardDescription>{t('analytics.geoByCountryDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400">
            {t('analytics.noCountryData')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {top.map((entry) => {
              const scoreColor =
                entry.avg_score === null ? 'text-gray-400'
                : entry.avg_score >= 70 ? 'text-green-600'
                : entry.avg_score >= 40 ? 'text-orange-600'
                : 'text-red-600';

              const barColor =
                entry.avg_score === null ? 'bg-gray-200'
                : entry.avg_score >= 70 ? 'bg-green-500'
                : entry.avg_score >= 40 ? 'bg-orange-500'
                : 'bg-red-500';

              const hasRisk = entry.critical_count + entry.high_count > 0;

              return (
                <div key={entry.country_code}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{countryFlag(entry.country_code)}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {entry.country_name}
                      </span>
                      {hasRisk && (
                        <span className="text-[10px] text-red-500 font-medium">
                          {t('analytics.atRisk', { count: entry.critical_count + entry.high_count })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.avg_score !== null && (
                        <span className={`text-xs font-semibold tabular-nums ${scoreColor}`}>
                          {entry.avg_score}/100
                        </span>
                      )}
                      <span className="text-xs text-gray-400 tabular-nums w-5 text-right">
                        {entry.supplier_count}
                      </span>
                    </div>
                  </div>
                  {/* Barre proportionnelle */}
                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-1.5 rounded-full transition-all ${barColor}`}
                      style={{ width: `${(entry.supplier_count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {entries.length > 10 && (
              <p className="text-xs text-gray-400 pt-1 text-center">
                {t('analytics.moreCountries', { count: entries.length - 10 })}
              </p>
            )}
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
