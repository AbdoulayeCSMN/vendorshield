'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { AlertTriangle, CheckCircle, Info, ShieldAlert, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { AlertsKpis } from '~/lib/vendorshield/alerts.server';

interface Props {
  kpis: AlertsKpis;
}

export function AlertsKpiBar({ kpis }: Props) {
  const { t } = useTranslation('vendorshield');
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterBy = (severity: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (severity) params.set('severity', severity);
    else params.delete('severity');
    params.delete('page');
    router.push(`/home/alerts?${params.toString()}`);
  };

  const activeSeverity = searchParams.get('severity');

  const cards = [
    {
      label: t('alerts.kpiOpen'),
      value: kpis.open_total,
      icon: Shield,
      iconCls: 'text-gray-500 bg-gray-50 dark:bg-gray-800',
      ringCls: '',
      severity: null,
    },
    {
      label: t('alerts.kpiCritical'),
      value: kpis.critical_open,
      icon: ShieldAlert,
      iconCls: 'text-red-600 bg-red-50 dark:bg-red-950',
      ringCls: 'ring-red-200 dark:ring-red-900',
      severity: 'critical',
    },
    {
      label: t('alerts.kpiWarning'),
      value: kpis.warning_open,
      icon: AlertTriangle,
      iconCls: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
      ringCls: 'ring-orange-200 dark:ring-orange-900',
      severity: 'warning',
    },
    {
      label: t('alerts.kpiInfo'),
      value: kpis.info_open,
      icon: Info,
      iconCls: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
      ringCls: 'ring-blue-200 dark:ring-blue-900',
      severity: 'info',
    },
    {
      label: t('alerts.kpiResolvedToday'),
      value: kpis.resolved_today,
      icon: CheckCircle,
      iconCls: 'text-green-600 bg-green-50 dark:bg-green-950',
      ringCls: '',
      severity: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, iconCls, ringCls, severity }) => {
        const isActive = activeSeverity === severity && severity !== null;
        return (
          <button
            key={label}
            onClick={() => severity !== null && filterBy(isActive ? null : severity)}
            className={`rounded-xl border bg-white dark:bg-gray-900 p-4 text-left shadow-sm transition-all
              ${severity ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
              ${isActive ? `ring-2 ${ringCls}` : 'border-gray-100 dark:border-gray-800'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`rounded-lg p-2 ${iconCls}`}>
                <Icon className="h-4 w-4" />
              </div>
              {isActive && (
                <span className="text-[10px] font-medium text-primary">{t('alerts.filtered')}</span>
              )}
            </div>
            <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </button>
        );
      })}
    </div>
  );
}
