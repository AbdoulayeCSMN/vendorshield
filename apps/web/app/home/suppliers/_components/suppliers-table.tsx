'use client';

import { useCallback, useTransition } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import {
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type { SuppliersFilters } from '~/lib/vendorshield/suppliers.server';
import {
  CATEGORY_LABELS,
  CRITICALITY_LABELS,
  RISK_LEVEL_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatEur,
  type RiskLevel,
  type SupplierCategory,
  type SupplierRiskSummary,
  type SupplierStatus,
} from '~/lib/vendorshield/types';

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number | null }) {
  if (score === null)
    return <span className="text-xs text-gray-400">—</span>;

  const color =
    score >= 70
      ? 'text-green-700 bg-green-50 border-green-200'
      : score >= 40
        ? 'text-orange-700 bg-orange-50 border-orange-200'
        : 'text-red-700 bg-red-50 border-red-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}
    >
      {score}
    </span>
  );
}

// ─── Risk level badge ─────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel | null }) {
  const { t } = useTranslation('vendorshield');
  if (!level) return <span className="text-xs text-gray-400">N/A</span>;

  const cfg = {
    low: {
      icon: ShieldCheck,
      cls: 'text-green-700 bg-green-50 border-green-200',
    },
    medium: {
      icon: AlertTriangle,
      cls: 'text-orange-700 bg-orange-50 border-orange-200',
    },
    high: {
      icon: ShieldAlert,
      cls: 'text-red-700 bg-red-50 border-red-200',
    },
    critical: {
      icon: ShieldAlert,
      cls: 'text-red-900 bg-red-100 border-red-300',
    },
  } as const;

  const { icon: Icon, cls } = cfg[level];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {t(`enums.riskLevel.${level}`)}
    </span>
  );
}

// ─── Score bar mini ───────────────────────────────────────────────────────────

function MiniScoreBar({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="mt-1 h-1 w-full rounded-full bg-gray-100 dark:bg-gray-800">
      <progress
        className={`h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${score >= 70 ? 'accent-green-500' : score >= 40 ? 'accent-orange-500' : 'accent-red-500'}`}
        value={score}
        max={100}
      />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SuppliersTableProps {
  suppliers: SupplierRiskSummary[];
  total: number;
  page: number;
  pageCount: number;
  filters: SuppliersFilters;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SuppliersTable({
  suppliers,
  total,
  page,
  pageCount,
  filters,
}: SuppliersTableProps) {
  const { t } = useTranslation('vendorshield');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Met à jour un paramètre URL en conservant les autres
  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Réinitialiser la page sur tout changement de filtre sauf pagination
      if (key !== 'page') params.delete('page');
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [searchParams, pathname, router],
  );

  // Tri : toggle asc/desc
  const toggleSort = (field: string) => {
    const currentSort = searchParams.get('sort');
    const currentOrder = searchParams.get('order') ?? 'asc';
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', field);
    params.set(
      'order',
      currentSort === field && currentOrder === 'asc' ? 'desc' : 'asc',
    );
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  // Nettoyer tous les filtres
  const clearFilters = () => {
    startTransition(() => router.push(pathname));
  };

  const hasActiveFilters =
    filters.q || filters.status || filters.risk_level || filters.category || filters.criticality;

  return (
    <div className="space-y-4">
      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('suppliers.search')}
            defaultValue={filters.q ?? ''}
            className="pl-9"
            onChange={(e) => {
              const v = e.target.value;
              // Debounce simplifié via événement onBlur/enter
              if (v === '') updateParam('q', null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                updateParam('q', (e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => updateParam('q', e.target.value)}
          />
        </div>

        {/* Filtre statut */}
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('suppliers.fStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('suppliers.allStatuses')}</SelectItem>
            {(Object.keys(STATUS_LABELS) as SupplierStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`enums.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre niveau de risque */}
        <Select
          value={filters.risk_level ?? 'all'}
          onValueChange={(v) => updateParam('risk_level', v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('suppliers.fRisk')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('suppliers.allRisks')}</SelectItem>
            {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((l) => (
              <SelectItem key={l} value={l}>
                {t(`enums.riskLevel.${l}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre catégorie */}
        <Select
          value={filters.category ?? 'all'}
          onValueChange={(v) => updateParam('category', v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('suppliers.fCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('suppliers.allCategories')}</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as SupplierCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {t(`enums.category.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Effacer les filtres */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            {t('suppliers.clear')}
          </Button>
        )}

        {/* Compteur */}
        <span className="ml-auto text-sm text-gray-500">
          {t('suppliers.results', { count: total })}
        </span>
      </div>

      {/* ── Table ── */}
      <div
        className={`rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}
      >
        {suppliers.length === 0 ? (
          <EmptyState hasFilters={!!hasActiveFilters} onClear={clearFilters} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-800">
                <TableHead className="w-[280px]">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    {t('suppliers.hSupplier')}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hCategory')}</span>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hCriticality')}</span>
                </TableHead>
                <TableHead className="text-center hidden xl:table-cell">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hFinancial')}</span>
                </TableHead>
                <TableHead className="text-center hidden xl:table-cell">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hOperational')}</span>
                </TableHead>
                <TableHead className="text-center hidden xl:table-cell">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hGeo')}</span>
                </TableHead>
                <TableHead className="text-center hidden xl:table-cell">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hEsg')}</span>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    onClick={() => toggleSort('global_score')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white mx-auto"
                  >
                    {t('suppliers.hGlobalScore')}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hRisk')}</span>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <span className="text-xs font-medium text-gray-500">{t('suppliers.hAlerts')}</span>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {suppliers.map((s) => (
                <TableRow
                  key={s.id}
                  className="border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => router.push(`/home/suppliers/${s.id}`)}
                >
                  {/* Fournisseur */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-base font-semibold text-gray-700 dark:text-gray-300">
                        {s.country_code ? (
                          <span className="text-xl">
                            {countryFlag(s.country_code)}
                          </span>
                        ) : (
                          s.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm text-gray-900 dark:text-white">
                          {s.name}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {s.country_name ?? s.country_code ?? '—'}
                          {s.is_sole_source && (
                            <span className="ml-1.5 inline-flex rounded bg-amber-50 px-1 text-amber-700 text-[10px] font-medium border border-amber-200">
                              {t('dashboard.matrixSoleSource')}
                            </span>
                          )}
                        </p>
                        <MiniScoreBar score={s.global_score} />
                      </div>
                    </div>
                  </TableCell>

                  {/* Catégorie */}
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {t(`enums.category.${s.category}`)}
                  </TableCell>

                  {/* Criticité */}
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {t(`enums.criticality.${s.criticality}`)}
                    </span>
                  </TableCell>

                  {/* Scores dimensionnels */}
                  <TableCell className="text-center hidden xl:table-cell">
                    <ScorePill score={s.financial_score} />
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell">
                    <ScorePill score={s.operational_score} />
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell">
                    <ScorePill score={s.geopolitical_score} />
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell">
                    <ScorePill score={s.esg_score} />
                  </TableCell>

                  {/* Score global */}
                  <TableCell className="text-center">
                    {s.global_score !== null ? (
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                          {s.global_score}
                        </span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Niveau risque */}
                  <TableCell className="text-center">
                    <RiskBadge level={s.risk_level} />
                  </TableCell>

                  {/* Alertes ouvertes */}
                  <TableCell className="hidden sm:table-cell">
                    {s.open_alerts > 0 ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700">
                        {s.open_alerts}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t('tabs.actions')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/home/suppliers/${s.id}`}>
                            {t('suppliers.aViewDetail')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/home/risk-assessments/new?supplier=${s.id}`}>
                            {t('suppliers.aNewAssessment')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/home/suppliers/${s.id}/edit`}>
                            {t('suppliers.aEdit')}
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Pagination ── */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('suppliers.pageOf', { page, total: pageCount })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => updateParam('page', String(page - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('suppliers.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount || isPending}
              onClick={() => updateParam('page', String(page + 1))}
            >
              {t('suppliers.next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  const { t } = useTranslation('vendorshield');
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
        <Filter className="h-7 w-7 text-gray-300" />
      </div>
      {hasFilters ? (
        <>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {t('suppliers.emptyFilteredTitle')}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {t('suppliers.emptyFilteredDesc')}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
            {t('suppliers.clear')}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {t('suppliers.emptyTitle')}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {t('suppliers.emptyDesc')}
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/home/suppliers/new">{t('suppliers.addSupplier')}</Link>
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

/** Convertit un code pays ISO 3166-1 en emoji drapeau */
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}
