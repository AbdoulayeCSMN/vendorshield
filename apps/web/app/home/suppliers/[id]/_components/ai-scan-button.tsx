'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import {
  AlertTriangle,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  Shield,
  ShieldAlert,
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

import type { OsintResult, OsintSignal } from '~/lib/vendorshield/ai.server';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  financial: TrendingUp, operational: Zap, geopolitical: Globe, esg: Shield,
};

const TYPE_COLORS: Record<string, string> = {
  financial: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  operational: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
  geopolitical: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
  esg: 'text-green-600 bg-green-50 dark:bg-green-950',
};

const SEVERITY_BORDER: Record<string, string> = {
  info: 'border-l-blue-400', warning: 'border-l-orange-400', critical: 'border-l-red-500',
};

const CONFIDENCE_CFG: Record<string, { label: string; cls: string }> = {
  low:    { label: 'Confiance faible',  cls: 'text-gray-500 bg-gray-50 dark:bg-gray-800' },
  medium: { label: 'Confiance moyenne', cls: 'text-orange-600 bg-orange-50' },
  high:   { label: 'Confiance élevée',  cls: 'text-green-700 bg-green-50' },
};

function SignalCard({ signal }: { signal: OsintSignal }) {
  const Icon = TYPE_ICONS[signal.type] ?? Shield;
  return (
    <div className={`flex items-start gap-3 rounded-lg border-l-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 ${SEVERITY_BORDER[signal.severity] ?? 'border-l-gray-300'}`}>
      <div className={`rounded-md p-1.5 shrink-0 mt-0.5 ${TYPE_COLORS[signal.type] ?? 'text-gray-600 bg-gray-50'}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{signal.title}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {signal.severity === 'critical' && <ShieldAlert className="h-3.5 w-3.5 text-red-500" />}
            {signal.severity === 'warning'  && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${(CONFIDENCE_CFG[signal.confidence] ?? CONFIDENCE_CFG.low).cls}`}>
              {(CONFIDENCE_CFG[signal.confidence] ?? CONFIDENCE_CFG.low).label}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{signal.description}</p>
      </div>
    </div>
  );
}

function ScanResultView({ result, alertsCreated, supplierId }: {
  result: OsintResult;
  alertsCreated: number;
  supplierId: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const levelColors: Record<string, string> = {
    low: 'text-green-700 bg-green-50 border-green-200',
    medium: 'text-orange-700 bg-orange-50 border-orange-200',
    high: 'text-red-700 bg-red-50 border-red-200',
    critical: 'text-red-900 bg-red-100 border-red-300',
  };
  const levelLabels: Record<string, string> = {
    low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé', critical: 'Risque critique',
  };

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-primary">Analyse IA — Résultats</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {result.risk_detected ? (
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${levelColors[result.overall_risk_level] ?? levelColors.medium}`}>
                {levelLabels[result.overall_risk_level] ?? result.overall_risk_level}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle className="h-3 w-3" />Risque faible détecté
              </span>
            )}
            <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {result.summary && <CardDescription className="mt-1">{result.summary}</CardDescription>}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {result.signals.length > 0 ? (
            result.signals.map((signal, i) => <SignalCard key={i} signal={signal} />)
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">Aucun signal de risque significatif détecté.</p>
          )}

          {alertsCreated > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {alertsCreated} alerte{alertsCreated > 1 ? 's' : ''} créée{alertsCreated > 1 ? 's' : ''} automatiquement
              </p>
              <Link href={`/home/alerts?supplier_id=${supplierId}`} className="text-xs text-primary hover:underline font-medium">
                Voir les alertes →
              </Link>
            </div>
          )}

          {result.model_note && (
            <p className="text-[11px] text-gray-400 italic leading-relaxed">ⓘ {result.model_note}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function AiScanButton({ supplierId }: { supplierId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ osint: OsintResult; alerts_created: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/ai/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplier_id: supplierId }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.setup ?? data.error ?? 'Erreur serveur');
          return;
        }
        setResult({ osint: data.osint, alerts_created: data.alerts_created ?? 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur réseau');
      }
    });
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleScan}
        disabled={isPending}
        className="border-primary/30 text-primary hover:bg-primary/5"
      >
        {isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyse IA en cours...</>
        ) : (
          <><Bot className="mr-2 h-4 w-4" />Analyser avec l'IA</>
        )}
      </Button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Analyse indisponible</p>
            <p className="text-xs mt-0.5 text-red-600">{error}</p>
            {error.includes('ANTHROPIC_API_KEY') && (
              <p className="text-xs mt-1 text-red-500">
                Ajoutez <code className="bg-red-100 px-1 rounded">ANTHROPIC_API_KEY=sk-ant-...</code> dans <code className="bg-red-100 px-1 rounded">.env.local</code>
              </p>
            )}
          </div>
        </div>
      )}

      {result && (
        <ScanResultView result={result.osint} alertsCreated={result.alerts_created} supplierId={supplierId} />
      )}
    </div>
  );
}
