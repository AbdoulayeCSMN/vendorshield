'use client';

import { useState, useTransition } from 'react';

import {
  AlertTriangle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { triggerOsintScanAction } from '~/lib/vendorshield/actions/ai.actions';
import type { AiAnalysis, Recommendation, RiskSignal } from '~/lib/vendorshield/ai.server';

// ─── Configs sévérité ─────────────────────────────────────────────────────────

const SEV_CFG = {
  critical: {
    dot: 'bg-red-500',
    badge: 'text-red-700 bg-red-50 border-red-200',
    label: 'Critique',
    icon: ShieldAlert,
  },
  warning: {
    dot: 'bg-orange-500',
    badge: 'text-orange-700 bg-orange-50 border-orange-200',
    label: 'Avertissement',
    icon: AlertTriangle,
  },
  info: {
    dot: 'bg-blue-500',
    badge: 'text-blue-700 bg-blue-50 border-blue-200',
    label: 'Information',
    icon: Shield,
  },
} as const;

const PRIO_CFG = {
  high:   { cls: 'text-red-700',    label: 'Priorité haute',   dot: 'bg-red-500' },
  medium: { cls: 'text-orange-700', label: 'Priorité moyenne', dot: 'bg-orange-400' },
  low:    { cls: 'text-gray-500',   label: 'Priorité basse',   dot: 'bg-gray-400' },
} as const;

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  financial:    TrendingUp,
  operational:  Zap,
  geopolitical: Globe,
  esg:          Shield,
  reputational: AlertTriangle,
};

// ─── Résultat d'une analyse ───────────────────────────────────────────────────

function AnalysisResult({ analysis }: { analysis: AiAnalysis }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const criticalSignals = analysis.risk_signals.filter((s) => s.severity === 'critical');
  const warningSignals  = analysis.risk_signals.filter((s) => s.severity === 'warning');
  const infoSignals     = analysis.risk_signals.filter((s) => s.severity === 'info');

  return (
    <div className="space-y-4">
      {/* Score de confiance + synthèse */}
      <div className={`rounded-xl p-4 ${
        (analysis.confidence_score ?? 0) >= 70
          ? 'bg-gray-50 dark:bg-gray-800/50'
          : 'bg-amber-50 dark:bg-amber-950/20'
      }`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
            {analysis.overall_assessment}
          </p>
          <div className="shrink-0 text-center">
            <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {analysis.confidence_score}
              <span className="text-sm font-normal text-gray-400">%</span>
            </div>
            <p className="text-[10px] text-gray-400">Confiance</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>Modèle : {analysis.model_used.replace('claude-', '').replace('-20250514', '')}</span>
          {analysis.prompt_tokens && (
            <span>{analysis.prompt_tokens + (analysis.completion_tokens ?? 0)} tokens</span>
          )}
          <span>{new Date(analysis.created_at).toLocaleString('fr-FR', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}</span>
          {analysis.alerts_created > 0 && (
            <span className="text-orange-600 font-medium">
              {analysis.alerts_created} alerte{analysis.alerts_created > 1 ? 's' : ''} créée{analysis.alerts_created > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Signaux de risque */}
      {analysis.risk_signals.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Aucun signal de risque détecté.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {analysis.risk_signals.length} signal{analysis.risk_signals.length > 1 ? 's' : ''} détecté{analysis.risk_signals.length > 1 ? 's' : ''}
          </p>

          {/* Résumé par sévérité */}
          <div className="flex gap-2 flex-wrap">
            {criticalSignals.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-red-700 bg-red-50 border-red-200">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {criticalSignals.length} critique{criticalSignals.length > 1 ? 's' : ''}
              </span>
            )}
            {warningSignals.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-orange-700 bg-orange-50 border-orange-200">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {warningSignals.length} avertissement{warningSignals.length > 1 ? 's' : ''}
              </span>
            )}
            {infoSignals.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {infoSignals.length} info{infoSignals.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Liste des signaux */}
          {analysis.risk_signals.map((signal, i) => {
            const cfg = SEV_CFG[signal.severity];
            const TypeIcon = TYPE_ICONS[signal.type] ?? Shield;
            const isOpen = expanded === `signal-${i}`;

            return (
              <div
                key={i}
                className={`rounded-lg border overflow-hidden ${
                  signal.severity === 'critical'
                    ? 'border-red-200 dark:border-red-900'
                    : signal.severity === 'warning'
                      ? 'border-orange-200 dark:border-orange-900'
                      : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <button
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left transition-colors"
                  onClick={() => setExpanded(isOpen ? null : `signal-${i}`)}
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <TypeIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white text-left">
                    {signal.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-gray-400">{signal.confidence}%</span>
                    {isOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 bg-gray-50 dark:bg-gray-800/30 space-y-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 pt-2 leading-relaxed">
                      {signal.description}
                    </p>
                    {signal.source_hint && (
                      <p className="text-xs text-gray-400">
                        Source suggérée : {signal.source_hint}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recommandations */}
      {analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {analysis.recommendations.length} recommandation{analysis.recommendations.length > 1 ? 's' : ''}
          </p>
          {analysis.recommendations.map((rec, i) => {
            const prio = PRIO_CFG[rec.priority];
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3"
              >
                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${prio.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${prio.cls}`}>
                      {prio.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{rec.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.rationale}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Historique des analyses ──────────────────────────────────────────────────

function AnalysisHistory({
  analyses,
  onSelect,
  selectedId,
}: {
  analyses: AiAnalysis[];
  onSelect: (a: AiAnalysis) => void;
  selectedId: string | null;
}) {
  if (analyses.length <= 1) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Historique
      </p>
      {analyses.map((a) => (
        <button
          key={a.id}
          onClick={() => onSelect(a)}
          className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
            selectedId === a.id
              ? 'bg-primary/5 border border-primary/20'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
          }`}
        >
          <div className={`h-2 w-2 rounded-full shrink-0 ${
            a.status === 'completed' ? 'bg-green-500'
            : a.status === 'failed'    ? 'bg-red-500'
            : a.status === 'running'   ? 'bg-blue-500 animate-pulse'
            : 'bg-gray-400'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(a.created_at).toLocaleString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          {a.status === 'completed' && (
            <span className="text-xs text-gray-400 shrink-0">
              {a.risk_signals?.length ?? 0} signal{(a.risk_signals?.length ?? 0) > 1 ? 's' : ''}
            </span>
          )}
          {a.status === 'failed' && (
            <span className="text-xs text-red-500 shrink-0">Échoué</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OsintPanelProps {
  supplierId: string;
  supplierName: string;
  initialAnalyses: AiAnalysis[];
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function OsintPanel({
  supplierId,
  supplierName,
  initialAnalyses,
}: OsintPanelProps) {
  const [analyses, setAnalyses] = useState<AiAnalysis[]>(initialAnalyses);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AiAnalysis | null>(
    initialAnalyses.find((a) => a.status === 'completed') ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const [triggerResult, setTriggerResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleTrigger = () => {
    setTriggerResult(null);
    startTransition(async () => {
      const result = await triggerOsintScanAction(supplierId);

      if (!result.success) {
        setTriggerResult({ type: 'error', message: result.error });
        return;
      }

      // Succès — recharger la page pour avoir les données fraîches
      // (revalidatePath est appelé dans l'action)
      setTriggerResult({
        type: 'success',
        message: `${result.data.signals_detected} signal${result.data.signals_detected !== 1 ? 's' : ''} détecté${result.data.signals_detected !== 1 ? 's' : ''}. ${result.data.alerts_created} alerte${result.data.alerts_created !== 1 ? 's' : ''} créée${result.data.alerts_created !== 1 ? 's' : ''}.`,
      });

      // Rafraîchir la page pour charger les nouvelles analyses
      window.location.reload();
    });
  };

  return (
    <div className="space-y-4">
      {/* En-tête avec bouton déclencheur */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Analyse IA — Intelligence OSINT
              </CardTitle>
              <CardDescription className="mt-1">
                Analyse contextuelle par LLM pour détecter les signaux de risque sur{' '}
                <strong>{supplierName}</strong>.
              </CardDescription>
            </div>
            <Button
              onClick={handleTrigger}
              disabled={isPending}
              size="sm"
              className="shrink-0"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Analyser maintenant
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {/* Info sur le fonctionnement */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              Claude Sonnet analyse le contexte complet
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
              Signaux critiques → alertes automatiques
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              Durée estimée : 5–15 secondes
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Feedback déclenchement */}
      {triggerResult && (
        <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
          triggerResult.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900'
            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900'
        }`}>
          {triggerResult.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{triggerResult.message}</span>
        </div>
      )}

      {/* Spinner pendant l'analyse */}
      {isPending && (
        <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/10">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
            Claude analyse {supplierName}…
          </p>
          <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
            Récupération du contexte · Identification des signaux · Génération des recommandations
          </p>
        </div>
      )}

      {/* Résultats */}
      {!isPending && (
        <>
          {analyses.length === 0 ? (
            /* Aucune analyse */
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
              <Brain className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aucune analyse réalisée
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Cliquez sur "Analyser maintenant" pour lancer la première analyse IA.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sélecteur si plusieurs analyses */}
              {analyses.length > 1 && (
                <AnalysisHistory
                  analyses={analyses}
                  selectedId={selectedAnalysis?.id ?? null}
                  onSelect={setSelectedAnalysis}
                />
              )}

              {/* Résultat sélectionné */}
              {selectedAnalysis && selectedAnalysis.status === 'completed' && (
                <AnalysisResult analysis={selectedAnalysis} />
              )}

              {selectedAnalysis && selectedAnalysis.status === 'failed' && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">L'analyse a échoué</p>
                    <p className="text-xs mt-0.5 text-red-600">
                      {selectedAnalysis.error_message ?? 'Erreur inconnue'}
                    </p>
                  </div>
                </div>
              )}

              {selectedAnalysis && selectedAnalysis.status === 'running' && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-700">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Analyse en cours… Actualisez la page dans quelques secondes.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
