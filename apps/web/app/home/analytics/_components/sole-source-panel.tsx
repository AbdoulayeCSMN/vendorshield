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

import {
  CATEGORY_LABELS,
  CRITICALITY_LABELS,
  type SupplierRiskSummary,
} from '~/lib/vendorshield/types';

interface Props {
  suppliers: SupplierRiskSummary[];
}

export function SoleSourcePanel({ suppliers }: Props) {
  const totalSpend = suppliers.reduce(
    (s, sup) => s + (sup.annual_spend_eur ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">Fournisseurs sole source</CardTitle>
        </div>
        <CardDescription>
          {suppliers.length === 0
            ? 'Aucun fournisseur unique identifié'
            : `${suppliers.length} fournisseur${suppliers.length > 1 ? 's' : ''} sans alternative — risque de dépendance critique`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suppliers.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            <div className="text-center">
              <ShieldAlert className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              Aucun sole source — bonne diversification.
            </div>
          </div>
        ) : (
          <>
            {/* Alerte dépense */}
            {totalSpend > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">
                    {formatEur(totalSpend)} d'achats annuels
                  </span>{' '}
                  concentrés sur des fournisseurs sans alternative identifiée.
                </p>
              </div>
            )}

            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {suppliers.map((s) => {
                const scoreColor =
                  s.global_score === null ? 'text-gray-400'
                  : s.global_score >= 70 ? 'text-green-600'
                  : s.global_score >= 40 ? 'text-orange-600'
                  : 'text-red-600';

                return (
                  <Link
                    key={s.id}
                    href={`/home/suppliers/${s.id}`}
                    className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity group"
                  >
                    {/* Flag */}
                    <span className="text-lg shrink-0">
                      {s.country_code ? countryFlag(s.country_code) : '🏢'}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {s.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {CATEGORY_LABELS[s.category]}
                        </span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-amber-600 font-medium">
                          {CRITICALITY_LABELS[s.criticality]}
                        </span>
                        {s.annual_spend_eur && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400">
                              {formatEur(s.annual_spend_eur)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-2 shrink-0">
                      {s.global_score !== null ? (
                        <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
                          {s.global_score}
                          <span className="text-[10px] font-normal text-gray-400">/100</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
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

function formatEur(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M€`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k€`;
  return `${amount}€`;
}
