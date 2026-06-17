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

// ─── Config sévérité ─────────────────────────────────────────────────────────

const SEV = {
  critical: { cls: 'text-red-700 bg-red-50 border-red-200',     label: 'Critique',        dot: 'bg-red-500' },
  warning:  { cls: 'text-orange-700 bg-orange-50 border-orange-200', label: 'Avertissement', dot: 'bg-orange-500' },
  info:     { cls: 'text-blue-700 bg-blue-50 border-blue-200',   label: 'Info',            dot: 'bg-blue-500' },
} as const;

const PRIO = {
  high:   { cls: 'text-red-600 font-medium',    label: '↑ Haute' },
  medium: { cls: 'text-orange-600 font-medium', label: '→ Moyenne' },
  low:    { cls: 'text-gray-400',               label: '↓ Basse' },
} as const;

// ─── Badge mode ───────────────────────────────────────────────────────────────

function ModeBadge({ status }: { status: AiConfigStatus }) {
  if (!status.configured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-600">
        <AlertTriangle className="h-2.5 w-2.5" />
        Non configuré
      </span>
    );
  }
  if (status.mode === 'mock') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        <TestTube className="h-2.5 w-2.5" />
        Simulation
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
  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
        <p className="font-medium text-red-700">Analyse échouée</p>
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
              Analyse terminée
            </p>
            {result.mock_mode && (
              <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-1.5 py-0.5 font-medium">
                simulation
              </span>
            )}
            {result.confidence_score !== undefined && (
              <span className="text-[10px] text-gray-400">
                confiance {result.confidence_score}%
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
              {signalCount} signal{signalCount !== 1 ? 's' : ''}
            </span>
            {alertCount > 0 && (
              <Link href="/home/alerts" className="text-xs font-medium text-orange-600 hover:underline">
                {alertCount} alerte{alertCount !== 1 ? 's' : ''} créée{alertCount !== 1 ? 's' : ''} →
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
              {new Date(analysis.created_at).toLocaleString('fr-FR', {
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
            <span>{analysis.risk_signals.length} signal{analysis.risk_signals.length !== 1 ? 's' : ''}</span>
            {analysis.alerts_created > 0 && (
              <span className="text-orange-500">· {analysis.alerts_created} alerte{analysis.alerts_created !== 1 ? 's' : ''}</span>
            )}
            {analysis.confidence_score !== null && (
              <span>· {analysis.confidence_score}% confiance</span>
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
            const cfg = SEV[signal.severity] ?? SEV.info;
            return (
              <div key={i} className={`rounded-lg border p-2.5 ${cfg.cls}`}>
                <div className="flex items-start gap-2 justify-between">
                  <p className="text-xs font-semibold flex-1">{signal.title}</p>
                  <span className={`text-[9px] font-medium shrink-0 rounded-full border px-1.5 py-px ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-80 leading-relaxed">{signal.description}</p>
                {signal.source_hint && (
                  <p className="text-[10px] mt-1 opacity-50">Source : {signal.source_hint}</p>
                )}
              </div>
            );
          })}

          {analysis.recommendations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Recommandations
              </p>
              {analysis.recommendations.map((rec, i) => {
                const prioCfg = PRIO[rec.priority] ?? PRIO.low;
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <span className={`text-[10px] shrink-0 mt-0.5 ${prioCfg.cls}`}>
                      {prioCfg.label}
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
              <CardTitle className="text-sm font-semibold">Analyse IA</CardTitle>
              <CardDescription className="text-[10px]">
                Signaux de risque automatiques
              </CardDescription>
            </div>
          </div>
          <ModeBadge status={configStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Bouton analyse */}
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
              Analyse en cours...
            </>
          ) : (
            <>
              <Brain className="h-3.5 w-3.5" />
              {configStatus.mode === 'mock'
                ? 'Simuler une analyse'
                : 'Analyser avec l\'IA'}
            </>
          )}
        </Button>

        {/* Message non configuré */}
        {!configStatus.configured && !isPending && !latestResult && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700 dark:text-gray-300">Configuration requise</p>
            <p>Pour activer l'IA :</p>
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

        {/* Loading state */}
        {isPending && (
          <div className="flex items-center gap-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                {configStatus.mode === 'mock' ? 'Simulation en cours...' : 'Analyse avec Llama 3.3...'}
              </p>
              <p className="text-xs text-violet-500 mt-0.5">
                Analyse du contexte fournisseur
              </p>
            </div>
          </div>
        )}

        {/* Résultat de la dernière analyse */}
        {latestResult && !isPending && (
          <AnalysisResultCard result={latestResult} />
        )}

        {/* Historique */}
        {analyses.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Historique
            </p>
            {analyses.slice(0, 5).map((a) => (
              <PastAnalysisItem key={a.id} analysis={a} />
            ))}
          </div>
        )}

        {analyses.length === 0 && !latestResult && !isPending && configStatus.configured && (
          <div className="py-4 text-center">
            <Brain className="h-7 w-7 text-gray-200 dark:text-gray-700 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">Aucune analyse réalisée</p>
          </div>
        )}

        {/* Footer modèle */}
        <p className="text-[9px] text-gray-300 dark:text-gray-700 text-center">
          {configStatus.mode === 'mock'
            ? 'Mode simulation — données fictives réalistes'
            : configStatus.mode === 'openrouter'
              ? 'Llama 3.3 via OpenRouter — modèle gratuit'
              : configStatus.mode === 'groq'
                ? 'Llama 3.3 via Groq — API gratuite'
                : 'Configurer OPENROUTER_API_KEY ou MOCK_AI=true'}
        </p>
      </CardContent>
    </Card>
  );
}
