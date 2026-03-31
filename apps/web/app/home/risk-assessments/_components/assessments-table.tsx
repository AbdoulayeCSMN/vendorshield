'use client';

import { useCallback, useTransition } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
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

import type { AssessmentsFilters, AssessmentWithSupplier } from '~/lib/vendorshield/assessments.server';
import {
  ASSESSMENT_STATUS_LABELS,
  CATEGORY_LABELS,
  type AssessmentStatus,
} from '~/lib/vendorshield/types';

// ─── Score delta badge ────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">—</span>;
  const color =
    score >= 70
      ? 'text-green-700 bg-green-50 border-green-200'
      : score >= 40
        ? 'text-orange-700 bg-orange-50 border-orange-200'
        : 'text-red-700 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AssessmentStatus, { cls: string; dot: string }> = {
  draft:       { cls: 'text-gray-600 bg-gray-50 border-gray-200',     dot: 'bg-gray-400' },
  in_progress: { cls: 'text-blue-700 bg-blue-50 border-blue-200',     dot: 'bg-blue-500' },
  completed:   { cls: 'text-green-700 bg-green-50 border-green-200',  dot: 'bg-green-500' },
  approved:    { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  archived:    { cls: 'text-gray-400 bg-gray-50 border-gray-100',     dot: 'bg-gray-300' },
};

function StatusBadge({ status }: { status: AssessmentStatus }) {
  const { cls, dot } = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {ASSESSMENT_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  assessments: AssessmentWithSupplier[];
  total: number;
  page: number;
  pageCount: number;
  filters: AssessmentsFilters;
}

export function AssessmentsTable({ assessments, total, page, pageCount, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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

  const toggleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const cur = searchParams.get('sort');
    const ord = searchParams.get('order') ?? 'desc';
    params.set('sort', field);
    params.set('order', cur === field && ord === 'desc' ? 'asc' : 'desc');
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(ASSESSMENT_STATUS_LABELS) as AssessmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{ASSESSMENT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-gray-500">
          {total} évaluation{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className={`rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        {assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
              <FileText className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Aucune évaluation</p>
            <p className="mt-1 text-xs text-gray-400">Lancez une première évaluation de risque.</p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/home/risk-assessments/new">Créer une évaluation</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-800">
                <TableHead>
                  <button onClick={() => toggleSort('assessment_date')} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    Évaluation <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell text-xs font-medium text-gray-500">Fournisseur</TableHead>
                <TableHead className="text-center hidden lg:table-cell text-xs font-medium text-gray-500">Fin.</TableHead>
                <TableHead className="text-center hidden lg:table-cell text-xs font-medium text-gray-500">Ops.</TableHead>
                <TableHead className="text-center hidden lg:table-cell text-xs font-medium text-gray-500">Géo.</TableHead>
                <TableHead className="text-center hidden lg:table-cell text-xs font-medium text-gray-500">ESG</TableHead>
                <TableHead className="text-center">
                  <button onClick={() => toggleSort('global_score')} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white mx-auto">
                    Score <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((a) => (
                <TableRow
                  key={a.id}
                  className="border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => router.push(`/home/risk-assessments/${a.id}`)}
                >
                  <TableCell className="py-3">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[200px]">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.assessment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {a.supplier && (
                      <div className="flex items-center gap-2">
                        <span>{a.supplier.country_code ? countryFlag(a.supplier.country_code) : '🏢'}</span>
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{a.supplier.name}</p>
                          <p className="text-xs text-gray-400">{CATEGORY_LABELS[a.supplier.category]}</p>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell"><ScorePill score={a.financial_score} /></TableCell>
                  <TableCell className="text-center hidden lg:table-cell"><ScorePill score={a.operational_score} /></TableCell>
                  <TableCell className="text-center hidden lg:table-cell"><ScorePill score={a.geopolitical_score} /></TableCell>
                  <TableCell className="text-center hidden lg:table-cell"><ScorePill score={a.esg_score} /></TableCell>
                  <TableCell className="text-center">
                    {a.global_score !== null ? (
                      <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{a.global_score}</span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={a.status as AssessmentStatus} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/home/risk-assessments/${a.id}`}>Voir le détail</Link>
                        </DropdownMenuItem>
                        {a.supplier && (
                          <DropdownMenuItem asChild>
                            <Link href={`/home/suppliers/${a.supplier.id}`}>Voir le fournisseur</Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} sur {pageCount}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => updateParam('page', String(page - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" />Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount || isPending} onClick={() => updateParam('page', String(page + 1))}>
              Suivant<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function countryFlag(code: string): string {
  return code.toUpperCase().split('').map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}
