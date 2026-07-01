'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  TestTube,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import {
  triggerAiAnalysisAction,
  type AiAnalysis,
  type AiAnalysisResult,
  type AiConfigStatus,
} from '~/lib/vendorshield/actions/ai.actions';

// ─── Severity / priority style maps (no text — labels come from i18n) ─────────

const SEV_CLS = {
  critical: 'text-red-700 bg-red-50 border-red-200',
  warning:  'text-orange-700 bg-orange-50 border-orange-200',
  info:     'text-blue-700 bg-blue-50 border-blue-200',
} as const;

const SEV_DOT = {
  critical: 'bg-red-500',
  warning:  'bg-orange-500',
  info:     'bg-blue-500',
} as const;

const PRIO_CLS = {
  high:   'text-red-600 font-medium',
  medium: 'text-orange-600 font-medium',
  low:    'text-gray-400',
} as const;

// ─── Badge mode ───────────────────────────────────────────────────────────────

function ModeBadge({ status }: { status: AiConfigStatus }) {
  const { t } = useTranslation('vendorshield');

  if (!status.configured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-600">
        <AlertTriangle className="h-2.5 w-2.5" />
        {t('ai.notConfigured')}
      </span>
    );
  }
  if (status.mode === 'mock') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        <TestTube className="h-2.5 w-2.5" />
        {t('ai.simulation')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Groq · Llama 3.3
    </span>
  );
}

// ─── Résultat d'une analyse ───────────────────────────────────────────────────

function AnalysisResultCard({ result }: { result: AiAnalysisResult }) {
  const { t } = useTranslation('vendorshield');

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
        <p className="font-medium text-red-700">{t('ai.analysisFailed')}</p>
        <p className="mt-1 text-xs text-red-600">{result.error}</p>
        {result.error?.includes('GROQ_API_KEY') && (
          <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-700 space-y-1">
            <p className="font-semibold">Pour résoudre :</p>
            <p>• Dev : ajouter <code className="bg-red-200 px-1 rounded">MOCK_AI=true</code> dans <code>.env</code></p>
            <p>• Prod : <code className="bg-red-200 px-1 rounded">supabase secrets set GROQ_API_KEY=gsk_...</code></p>
          </div>
        )}
      </div>
    );
  }

  const signalCount = result.signals_detected ?? 0;
  const alertCount  = result.alerts_created ?? 0;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('ai.analysisCompleted')}
            </p>
            {result.mock_mode && (
              <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-1.5 py-0.5 font-medium">
                simulation
              </span>
            )}
            {result.confidence_score !== undefined && (
              <span className="text-[10px] text-gray-400">
                {t('ai.confidence')} {result.confidence_score}%
              </span>
            )}
          </div>
          {result.overall_assessment && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {result.overall_assessment}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-500">
              {t('ai.signal', { count: signalCount })}
            </span>
            {alertCount > 0 && (
              <Link href="/home/alerts" className="text-xs font-medium text-orange-600 hover:underline">
                {t('ai.alertsCreated', { count: alertCount })}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Historique d'une analyse ─────────────────────────────────────────────────

function PastAnalysisItem({ analysis }: { analysis: AiAnalysis }) {
  const { t, i18n } = useTranslation('vendorshield');
  const [open, setOpen] = useState(false);

  const criticalCount = analysis.risk_signals.filter((s) => s.severity === 'critical').length;
  const warningCount  = analysis.risk_signals.filter((s) => s.severity === 'warning').length;
  const isMock        = analysis.model_used === 'mock';

  return (
    <div className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
      <button
        className="w-full flex items-start gap-2.5 py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left rounded-lg"
        onClick={() => setOpen((o) => !o)}
      >
        <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
          criticalCount > 0 ? 'bg-red-500'
          : warningCount > 0 ? 'bg-orange-500'
          : 'bg-green-500'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs text-gray-500">
              {new Date(analysis.created_at).toLocaleString(i18n.language, {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            {isMock && (
              <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-600 rounded-full px-1 py-px">
                simulation
              </span>
            )}
          </div>
          {analysis.overall_assessment && (
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-1">
              {analysis.overall_assessment}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
            <span>{t('ai.signal', { count: analysis.risk_signals.length })}</span>
            {analysis.alerts_created > 0 && (
              <span className="text-orange-500">· {t('ai.alertsCreated', { count: analysis.alerts_created })}</span>
            )}
            {analysis.confidence_score !== null && (
              <span>· {analysis.confidence_score}% {t('ai.confidence')}</span>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp   className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-1" />
          : <ChevronDown className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-1" />
        }
      </button>

      {open && (
        <div className="pb-3 px-1 space-y-2">
          {analysis.risk_signals.map((signal, i) => {
            const sevCls = SEV_CLS[signal.severity] ?? SEV_CLS.info;
            const sevLabel = t(`enums.severity.${signal.severity}`, { defaultValue: signal.severity });
            return (
              <div key={i} className={`rounded-lg border p-2.5 ${sevCls}`}>
                <div className="flex items-start gap-2 justify-between">
                  <p className="text-xs font-semibold flex-1">{signal.title}</p>
                  <span className={`text-[9px] font-medium shrink-0 rounded-full border px-1.5 py-px ${sevCls}`}>
                    {sevLabel}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-80 leading-relaxed">{signal.description}</p>
                {signal.source_hint && (
                  <p className="text-[10px] mt-1 opacity-50">{t('ai.source')} {signal.source_hint}</p>
                )}
              </div>
            );
          })}

          {analysis.recommendations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('ai.recommendations')}
              </p>
              {analysis.recommendations.map((rec, i) => {
                const prioCls = PRIO_CLS[rec.priority] ?? PRIO_CLS.low;
                const prioLabel = t(`enums.priority.${rec.priority}`, { defaultValue: rec.priority });
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <span className={`text-[10px] shrink-0 mt-0.5 ${prioCls}`}>
                      {prioLabel}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                        {rec.action}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{rec.rationale}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  supplierId: string;
  pastAnalyses: AiAnalysis[];
  configStatus: AiConfigStatus;
}

export function SupplierAiPanel({ supplierId, pastAnalyses, configStatus }: Props) {
  const { t } = useTranslation('vendorshield');
  const [isPending, startTransition] = useTransition();
  const [latestResult, setLatestResult] = useState<AiAnalysisResult | null>(null);
  const [analyses, setAnalyses] = useState<AiAnalysis[]>(pastAnalyses);

  const handleAnalyze = () => {
    setLatestResult(null);
    startTransition(async () => {
      const result = await triggerAiAnalysisAction(supplierId);
      setLatestResult(result);

      if (result.success && result.analysis_id) {
        setAnalyses((prev) => [
          {
            id:                 result.analysis_id!,
            supplier_id:        supplierId,
            status:             'completed',
            model_used:         result.mock_mode ? 'mock' : 'llama-3.3-70b-versatile',
            overall_assessment: result.overall_assessment ?? null,
            confidence_score:   result.confidence_score ?? null,
            risk_signals:       [],
            recommendations:    [],
            alerts_created:     result.alerts_created ?? 0,
            error_message:      null,
            created_at:         new Date().toISOString(),
            completed_at:       new Date().toISOString(),
            prompt_tokens:      null,
            completion_tokens:  null,
          },
          ...prev,
        ]);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg p-1.5 bg-violet-50 dark:bg-violet-950">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{t('ai.title')}</CardTitle>
              <CardDescription className="text-[10px]">
                {t('ai.subtitle')}
              </CardDescription>
            </div>
          </div>
          <ModeBadge status={configStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Button
          onClick={handleAnalyze}
          disabled={isPending}
          className="w-full gap-2"
          size="sm"
          variant={configStatus.configured ? 'default' : 'outline'}
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('ai.analyzing')}
            </>
          ) : (
            <>
              <Brain className="h-3.5 w-3.5" />
              {configStatus.mode === 'mock' ? t('ai.simulateButton') : t('ai.analyzeButton')}
            </>
          )}
        </Button>

        {!configStatus.configured && !isPending && !latestResult && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700 dark:text-gray-300">{t('ai.configRequired')}</p>
            <p>{t('ai.configHowTo')}</p>
            <p className="font-mono bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-[10px]">
              # Dev : ajouter dans .env<br />
              MOCK_AI=true
            </p>
            <p className="font-mono bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-[10px]">
              # Prod : clé Groq (gratuite)<br />
              GROQ_API_KEY=gsk_...
            </p>
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                {configStatus.mode === 'mock' ? t('ai.simulating') : t('ai.analyzeButtonLlama')}
              </p>
              <p className="text-xs text-violet-500 mt-0.5">
                {t('ai.analyzingContext')}
              </p>
            </div>
          </div>
        )}

        {latestResult && !isPending && (
          <AnalysisResultCard result={latestResult} />
        )}

        {analyses.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {t('ai.historyTitle')}
            </p>
            {analyses.slice(0, 5).map((a) => (
              <PastAnalysisItem key={a.id} analysis={a} />
            ))}
          </div>
        )}

        {analyses.length === 0 && !latestResult && !isPending && configStatus.configured && (
          <div className="py-4 text-center">
            <Brain className="h-7 w-7 text-gray-200 dark:text-gray-700 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">{t('ai.noAnalysis')}</p>
          </div>
        )}

        <p className="text-[9px] text-gray-300 dark:text-gray-700 text-center">
          {configStatus.mode === 'mock'
            ? t('ai.footerMock')
            : configStatus.mode === 'openrouter'
              ? t('ai.footerOpenrouter')
              : configStatus.mode === 'groq'
                ? t('ai.footerGroq')
                : t('ai.footerUnconfigured')}
        </p>
      </CardContent>
    </Card>
  );
}
