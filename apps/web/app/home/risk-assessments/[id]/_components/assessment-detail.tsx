'use client';

import { useTransition } from 'react';

import Link from 'next/link';

import {
  Archive,
  CheckCircle,
  ChevronRight,
  Globe,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Progress } from '@kit/ui/progress';
import { Separator } from '@kit/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import {
  approveAssessmentAction,
  archiveAssessmentAction,
} from '~/lib/vendorshield/actions/assessment.actions';
import type { AssessmentWithFactors } from '~/lib/vendorshield/assessments.server';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';
import type {
  AssessmentStatus,
  RiskDimension,
  RiskFactor,
} from '~/lib/vendorshield/types';
import { ExportButton } from '~/home/_components/export-button';

// ─── Score display ────────────────────────────────────────────────────────────

function ScoreDisplay({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const color = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-orange-600' : 'text-red-600';
  const textSize = size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-2xl' : 'text-lg';
  return (
    <span className={`font-bold tabular-nums ${textSize} ${color}`}>
      {score}<span className="text-sm font-normal text-gray-400">/100</span>
    </span>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number | null }) {
  const pct = score ?? 0;
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Factor row ───────────────────────────────────────────────────────────────

function FactorRow({ factor }: { factor: RiskFactor }) {
  const { t } = useTranslation('vendorshield');
  const color =
    factor.score >= 70 ? 'text-green-600' : factor.score >= 40 ? 'text-orange-600' : 'text-red-600';
  const factorLabel = t(`assessment.factor.${factor.factor_key}`, { defaultValue: factor.factor_label });

  return (
    <div className="py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">{factorLabel}</p>
        <span className={`text-sm font-bold tabular-nums shrink-0 ${color}`}>{factor.score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-1.5 rounded-full ${
            factor.score >= 70 ? 'bg-green-500' : factor.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${factor.score}%` }}
        />
      </div>
      {factor.evidence && (
        <p className="mt-1.5 text-xs text-gray-400 italic">{factor.evidence}</p>
      )}
    </div>
  );
}

// ─── Dimension panel ──────────────────────────────────────────────────────────

function DimensionPanel({
  dim,
  score,
  factors,
}: {
  dim: RiskDimension;
  score: number | null;
  factors: RiskFactor[];
}) {
  const { t } = useTranslation('vendorshield');
  const { dimensionLabels } = useEnumLabels();

  const cfg = {
    financial:    { icon: <TrendingUp className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
    operational:  { icon: <Zap className="h-4 w-4" />,        color: 'text-orange-600 bg-orange-50 dark:bg-orange-950' },
    geopolitical: { icon: <Globe className="h-4 w-4" />,      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
    esg:          { icon: <Shield className="h-4 w-4" />,     color: 'text-green-600 bg-green-50 dark:bg-green-950' },
  } as const;

  const { icon, color } = cfg[dim];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
            <CardTitle className="text-sm">{dimensionLabels[dim]}</CardTitle>
          </div>
          <ScoreDisplay score={score} size="md" />
        </div>
        <ScoreBar score={score} />
      </CardHeader>
      <CardContent className="pt-0">
        {factors.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">{t('assessment.noFactors')}</p>
        ) : (
          factors.map((f) => <FactorRow key={f.id} factor={f} />)
        )}
      </CardContent>
    </Card>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AssessmentStatus, { cls: string; dot: string }> = {
  draft:       { cls: 'text-gray-600 bg-gray-50 border-gray-200',    dot: 'bg-gray-400' },
  in_progress: { cls: 'text-blue-700 bg-blue-50 border-blue-200',    dot: 'bg-blue-500' },
  completed:   { cls: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' },
  approved:    { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  archived:    { cls: 'text-gray-400 bg-gray-50 border-gray-100',    dot: 'bg-gray-300' },
};

function StatusBadge({ status }: { status: AssessmentStatus }) {
  const { assessmentStatusLabels } = useEnumLabels();
  const { cls, dot } = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {assessmentStatusLabels[status]}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssessmentDetail({ assessment }: { assessment: AssessmentWithFactors }) {
  const { t, i18n } = useTranslation('vendorshield');
  const { categoryLabels, dimensionLabels } = useEnumLabels();
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      await approveAssessmentAction(assessment.id);
    });
  };

  const handleArchive = () => {
    if (!confirm(t('assessment.archiveConfirm'))) return;
    startTransition(async () => {
      await archiveAssessmentAction(assessment.id);
    });
  };

  const { factors_by_dimension } = assessment;

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
  const dateShortFormatter = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  const notesSections = [
    { label: t('assessment.execSummaryLabel'), value: assessment.executive_summary },
    { label: t('assessment.analystNotesLabel'), value: assessment.analyst_notes },
    { label: t('assessment.mitigationLabel'), value: assessment.mitigation_plan },
  ];

  const weightDimensions = [
    { key: 'financial' as RiskDimension,    weight: assessment.weight_financial },
    { key: 'operational' as RiskDimension,  weight: assessment.weight_operational },
    { key: 'geopolitical' as RiskDimension, weight: assessment.weight_geopolitical },
    { key: 'esg' as RiskDimension,          weight: assessment.weight_esg },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {assessment.supplier && (
            <Link
              href={`/home/suppliers/${assessment.supplier.id}`}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {assessment.supplier.country_code && countryFlag(assessment.supplier.country_code)}{' '}
              {assessment.supplier.name}
              <span className="text-gray-400">— {categoryLabels[assessment.supplier.category]}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={assessment.status as AssessmentStatus} />
            <span className="text-xs text-gray-400">
              {dateFormatter.format(new Date(assessment.assessment_date))}
            </span>
            {assessment.next_review_date && (
              <span className="text-xs text-gray-400">
                {t('assessment.nextReview')} {dateShortFormatter.format(new Date(assessment.next_review_date))}
              </span>
            )}
            <span className="text-xs text-gray-400">· v{assessment.version}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportButton context="assessment" assessmentId={assessment.id} />
          {assessment.status === 'completed' && (
            <Button onClick={handleApprove} disabled={isPending} size="sm">
              <CheckCircle className="mr-1.5 h-4 w-4" />
              {t('assessment.btnApprove')}
            </Button>
          )}
          {(assessment.status === 'completed' || assessment.status === 'approved') && (
            <Button variant="outline" size="sm" onClick={handleArchive} disabled={isPending}>
              <Archive className="mr-1.5 h-4 w-4" />
              {t('assessment.btnArchive')}
            </Button>
          )}
        </div>
      </div>

      {/* Global score */}
      <div className={`rounded-xl p-6 text-center ${
        assessment.global_score === null ? 'bg-gray-50 dark:bg-gray-800/30' :
        assessment.global_score >= 70 ? 'bg-green-50 dark:bg-green-950/30' :
        assessment.global_score >= 40 ? 'bg-orange-50 dark:bg-orange-950/30' :
        'bg-red-50 dark:bg-red-950/30'
      }`}>
        <p className="text-sm text-gray-500 mb-2">{t('assessment.globalScore')}</p>
        <ScoreDisplay score={assessment.global_score} size="lg" />
        <p className="mt-2 text-sm text-gray-500">
          {assessment.global_score === null
            ? t('assessment.inProgress')
            : assessment.global_score >= 70 ? t('assessment.riskLow')
            : assessment.global_score >= 40 ? t('assessment.riskModerate')
            : assessment.global_score >= 20 ? t('assessment.riskHigh')
            : t('assessment.riskCritical')}
        </p>
      </div>

      {/* Weights */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {weightDimensions.map(({ key, weight }) => (
          <div key={key} className="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center">
            <p className="text-xs text-gray-500">{dimensionLabels[key]}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{weight}%</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">{t('assessment.tabScores')}</TabsTrigger>
          <TabsTrigger value="notes">{t('assessment.tabNotes')}</TabsTrigger>
        </TabsList>

        {/* Detailed scores */}
        <TabsContent value="scores" className="mt-4 space-y-4">
          {(['financial', 'operational', 'geopolitical', 'esg'] as RiskDimension[]).map((dim) => (
            <DimensionPanel
              key={dim}
              dim={dim}
              score={assessment[`${dim}_score` as keyof AssessmentWithFactors] as number | null}
              factors={factors_by_dimension[dim] ?? []}
            />
          ))}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          {notesSections.map(({ label, value }) =>
            value ? (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{value}</p>
                </CardContent>
              </Card>
            ) : null,
          )}
          {!assessment.executive_summary && !assessment.analyst_notes && !assessment.mitigation_plan && (
            <div className="py-8 text-center text-sm text-gray-400">{t('assessment.noNotes')}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function countryFlag(code: string): string {
  return code.toUpperCase().split('').map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}
