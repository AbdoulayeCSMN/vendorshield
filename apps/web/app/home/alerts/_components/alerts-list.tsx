'use client';

import { useCallback, useState, useTransition } from 'react';

import { useTranslation } from 'react-i18next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import Link from 'next/link';

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Filter,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import {
  acknowledgeAlertAction,
  dismissAlertAction,
  resolveAlertAction,
} from '~/lib/vendorshield/actions/alert.actions';
import type { AlertWithSupplier, AlertsFilters } from '~/lib/vendorshield/alerts.server';
import {
  type AlertSeverity,
  type AlertStatus,
} from '~/lib/vendorshield/types';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';

// ─── Icône et couleur selon sévérité ─────────────────────────────────────────

const SEVERITY_CFG: Record<AlertSeverity, {
  dot: string;
  badge: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  critical: {
    dot: 'bg-red-500',
    badge: 'text-red-700 bg-red-50 border-red-200',
    border: 'border-l-red-500',
    icon: ShieldAlert,
  },
  warning: {
    dot: 'bg-orange-500',
    badge: 'text-orange-700 bg-orange-50 border-orange-200',
    border: 'border-l-orange-500',
    icon: AlertTriangle,
  },
  info: {
    dot: 'bg-blue-500',
    badge: 'text-blue-700 bg-blue-50 border-blue-200',
    border: 'border-l-blue-500',
    icon: AlertTriangle,
  },
};

const STATUS_CFG: Record<AlertStatus, { labelKey: string; cls: string }> = {
  open:         { labelKey: 'alerts.statusOpen',         cls: 'text-red-600 bg-red-50' },
  acknowledged: { labelKey: 'alerts.statusAcknowledged', cls: 'text-orange-600 bg-orange-50' },
  resolved:     { labelKey: 'alerts.statusResolved',     cls: 'text-green-600 bg-green-50' },
  dismissed:    { labelKey: 'alerts.statusDismissed',    cls: 'text-gray-400 bg-gray-50' },
};

// ─── Dialog résolution ────────────────────────────────────────────────────────

function ResolveDialog({
  alertId,
  open,
  onClose,
}: {
  alertId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('vendorshield');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await resolveAlertAction(alertId, fd);
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('alerts.resolveTitle')}</DialogTitle>
          <DialogDescription>
            {t('alerts.resolveDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t('alerts.resolveNoteLabel')}</Label>
            <Textarea
              name="resolution_note"
              placeholder={t('alerts.resolutionPlaceholder')}
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? t('alerts.resolving') : t('alerts.resolveConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte alerte ─────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onResolve,
}: {
  alert: AlertWithSupplier;
  onResolve: (id: string) => void;
}) {
  const { t, i18n } = useTranslation('vendorshield');
  const { severityLabels } = useEnumLabels();
  const [isPending, startTransition] = useTransition();
  const sev = SEVERITY_CFG[alert.severity as AlertSeverity] ?? SEVERITY_CFG.info;
  const sta = STATUS_CFG[alert.status as AlertStatus] ?? STATUS_CFG.open;

  const handleAcknowledge = () => {
    startTransition(async () => {
      await acknowledgeAlertAction(alert.id);
    });
  };

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissAlertAction(alert.id);
    });
  };

  return (
    <div
      className={`relative flex gap-4 rounded-xl border border-gray-100 dark:border-gray-800 border-l-4 ${sev.border} bg-white dark:bg-gray-900 p-4 shadow-sm transition-opacity ${isPending ? 'opacity-50' : ''}`}
    >
      {/* Icône sévérité */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sev.badge}`}>
        <sev.icon className="h-4 w-4" />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {alert.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alert.message}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sev.badge} border`}>
              {severityLabels[alert.severity as AlertSeverity]}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sta.cls}`}>
              {t(sta.labelKey)}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {alert.supplier && (
            <Link
              href={`/home/suppliers/${alert.supplier.id}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {alert.supplier.country_code && countryFlag(alert.supplier.country_code)}
              {alert.supplier.name}
            </Link>
          )}
          {alert.score_snapshot !== null && (
            <span className="text-xs text-gray-400">
              {t('alerts.score', { score: alert.score_snapshot })}
            </span>
          )}
          {alert.score_delta !== null && alert.score_delta !== 0 && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${alert.score_delta < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {alert.score_delta < 0
                ? <TrendingDown className="h-3 w-3" />
                : <TrendingUp className="h-3 w-3" />}
              {alert.score_delta > 0 ? '+' : ''}{alert.score_delta} pts
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {formatRelativeTime(alert.created_at, i18n.language)}
          </span>
        </div>

        {/* Actions inline pour alertes ouvertes */}
        {alert.status === 'open' && (
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleAcknowledge}
              disabled={isPending}
            >
              <Check className="mr-1 h-3 w-3" />
              {t('alerts.acknowledge')}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onResolve(alert.id)}
              disabled={isPending}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t('alerts.resolve')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={isPending}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {alert.supplier && (
                  <DropdownMenuItem asChild>
                    <Link href={`/home/suppliers/${alert.supplier.id}`}>
                      {t('alerts.viewSupplier')}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-gray-500"
                  onClick={handleDismiss}
                >
                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                  {t('alerts.dismiss')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Note de résolution */}
        {alert.resolution_note && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded px-2 py-1">
            ✓ {alert.resolution_note}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  alerts: AlertWithSupplier[];
  total: number;
  page: number;
  pageCount: number;
  filters: AlertsFilters;
}

export function AlertsList({ alerts, total, page, pageCount, filters }: Props) {
  const { t } = useTranslation('vendorshield');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [resolveDialogId, setResolveDialogId] = useState<string | null>(null);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === 'all') params.delete(key);
      else params.set(key, value);
      if (key !== 'page') params.delete('page');
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [searchParams, pathname, router],
  );

  const hasFilters = filters.status || filters.severity;

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('alerts.filterAllStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('alerts.filterAllStatuses')}</SelectItem>
            <SelectItem value="open">{t('alerts.filterStatusOpen')}</SelectItem>
            <SelectItem value="acknowledged">{t('alerts.filterStatusAcknowledged')}</SelectItem>
            <SelectItem value="resolved">{t('alerts.filterStatusResolved')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.severity ?? 'all'}
          onValueChange={(v) => updateParam('severity', v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('alerts.filterAllSeverities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('alerts.filterAllSeverities')}</SelectItem>
            <SelectItem value="critical">{t('alerts.filterSeverityCritical')}</SelectItem>
            <SelectItem value="warning">{t('alerts.filterSeverityWarning')}</SelectItem>
            <SelectItem value="info">{t('alerts.filterSeverityInfo')}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              startTransition(() => router.push(pathname));
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {t('alerts.clearFilters')}
          </Button>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {t('alerts.count', { count: total })}
        </span>
      </div>

      {/* Liste */}
      <div className={`space-y-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
              <Filter className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {hasFilters ? t('alerts.emptyFiltered') : t('alerts.emptyGlobal')}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {hasFilters ? t('alerts.emptyFilteredHint') : t('alerts.emptyGlobalHint')}
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={setResolveDialogId}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{t('alerts.pageOf', { page, pageCount })}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isPending}
              onClick={() => updateParam('page', String(page - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" />{t('suppliers.prev')}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount || isPending}
              onClick={() => updateParam('page', String(page + 1))}>
              {t('suppliers.next')}<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog résolution */}
      {resolveDialogId && (
        <ResolveDialog
          alertId={resolveDialogId}
          open={true}
          onClose={() => setResolveDialogId(null)}
        />
      )}
    </div>
  );
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join('');
}

function formatRelativeTime(dateStr: string, locale?: string): string {
  const date = new Date(dateStr);
  const diff = (Date.now() - date.getTime()) / 1000;

  if (diff < 60) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.round(diff), 'second');
  if (diff < 3600) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.round(diff / 3600), 'hour');
  if (diff < 604800) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.round(diff / 86400), 'day');
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
