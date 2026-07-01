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
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

import {
  triggerBankruptcyPredictionAction,
  type BankruptcyPrediction,
  type BankruptcyRiskZone,
  type PredictionResult,
} from '~/lib/vendorshield/actions/prediction.actions';

// ─── Zone config (no text — labels come from i18n) ───────────────────────────

const ZONE_CFG = {
  safe: {
    icon:   ShieldCheck,
    color:  '#22c55e',
    bg:     'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
    text:   'text-green-700 dark:text-green-400',
    range:  'Z ≥ 2.6',
  },
  grey: {
    icon:   AlertTriangle,
    color:  '#f97316',
    bg:     'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-900',
    text:   'text-orange-700 dark:text-orange-400',
    range:  '1.1 ≤ Z < 2.6',
  },
  distress: {
    icon:   ShieldAlert,
    color:  '#dc2626',
    bg:     'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900',
    text:   'text-red-700 dark:text-red-400',
    range:  'Z < 1.1',
  },
} as const;

const IMPACT_CLS = {
  high:   'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  low:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
} as const;

function probTextClass(pct: number) {
  return pct > 30 ? 'text-red-500' : pct > 15 ? 'text-orange-500' : 'text-green-500';
}

function probAccentClass(pct: number) {
  return pct > 30 ? 'accent-red-500' : pct > 15 ? 'accent-orange-500' : 'accent-green-500';
}

function zoneDotClass(color: string) {
  if (color === '#22c55e') return 'bg-green-500';
  if (color === '#f97316') return 'bg-orange-500';
  return 'bg-red-500';
}

// ─── Gauge Z-Score ─────────────────────────────────────────────────────────────

function ZScoreGauge({ z, zone }: { z: number; zone: BankruptcyRiskZone }) {
  const { t } = useTranslation('vendorshield');
  const cfg = ZONE_CFG[zone];
  const pct  = Math.min(1, Math.max(0, z / 4));
  const deg  = -130 + pct * 260;
  const r    = 48;
  const cx   = 60;
  const cy   = 60;

  const arcPath = (startDeg: number, endDeg: number, color: string) => {
    const toRad  = (d: number) => (d * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy + r * Math.sin(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
      />
    );
  };

  const needleX = cx + (r - 8) * Math.cos(((deg) * Math.PI) / 180);
  const needleY = cy + (r - 8) * Math.sin(((deg) * Math.PI) / 180);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="80" viewBox="0 0 120 80">
        {arcPath(-130, -43, '#ef4444')}
        {arcPath(-43,   44, '#f97316')}
        {arcPath( 44,  130, '#22c55e')}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke={cfg.color} strokeWidth="3" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="5" fill={cfg.color}/>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="16" fontWeight="700"
          fill={cfg.color}>{z.toFixed(2)}</text>
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize="8"
          fill="currentColor" opacity="0.5">Z-Score</text>
        <text x="16" y="75" textAnchor="middle" fontSize="7" fill="#ef4444">{t('bankruptcy.zoneDistressShort')}</text>
        <text x="62" y="20" textAnchor="middle" fontSize="7" fill="#f97316">{t('bankruptcy.zoneGreyShort')}</text>
        <text x="104" y="75" textAnchor="middle" fontSize="7" fill="#22c55e">{t('bankruptcy.zoneSafeShort')}</text>
      </svg>

      <div className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${cfg.text} ${cfg.border} ${cfg.bg}`}>
        {t(`bankruptcy.zone${zone.charAt(0).toUpperCase() + zone.slice(1)}`)} · {cfg.range}
      </div>
    </div>
  );
}

// ─── Barre de probabilité ─────────────────────────────────────────────────────

function ProbBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${probTextClass(pct)}`}>
          {pct}%
        </span>
      </div>
      <progress
        className={`h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${probAccentClass(pct)}`}
        value={pct}
        max={100}
      />
    </div>
  );
}

// ─── Résultat d'une prédiction ─────────────────────────────────────────────────

function PredictionResultCard({ result }: { result: PredictionResult }) {
  const { t } = useTranslation('vendorshield');

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        <p className="font-medium">{t('bankruptcy.predictionFailed')}</p>
        <p className="mt-0.5">{result.error}</p>
      </div>
    );
  }

  const zone = result.risk_zone!;
  const cfg  = ZONE_CFG[zone];

  return (
    <div className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('bankruptcy.predictionGenerated')}
        </p>
        {result.mock_mode && (
          <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-1.5 py-px">
            simulation
          </span>
        )}
      </div>
      <div className={`text-sm font-semibold ${cfg.text} mb-1`}>
        Z = {result.z_score?.toFixed(2)} · {t(`bankruptcy.zone${zone.charAt(0).toUpperCase() + zone.slice(1)}`)}
      </div>
      <div className="space-y-1">
        <ProbBar label={t('bankruptcy.label6m')}  pct={result.probability_6m!}  color={result.probability_6m!  > 30 ? '#ef4444' : result.probability_6m!  > 15 ? '#f97316' : '#22c55e'} />
        <ProbBar label={t('bankruptcy.label12m')} pct={result.probability_12m!} color={result.probability_12m! > 30 ? '#ef4444' : result.probability_12m! > 15 ? '#f97316' : '#22c55e'} />
        <ProbBar label={t('bankruptcy.label24m')} pct={result.probability_24m!} color={result.probability_24m! > 30 ? '#ef4444' : result.probability_24m! > 15 ? '#f97316' : '#22c55e'} />
      </div>
    </div>
  );
}

// ─── Détail d'une prédiction historique ──────────────────────────────────────

function PredictionDetail({ p }: { p: BankruptcyPrediction }) {
  const { t, i18n } = useTranslation('vendorshield');
  const [open, setOpen] = useState(false);
  const [horizon, setHorizon] = useState<'6m' | '12m' | '24m'>('12m');
  const cfg = ZONE_CFG[p.risk_zone];

  const narratives = { '6m': p.narrative_6m, '12m': p.narrative_12m, '24m': p.narrative_24m };
  const probColor = (pct: number) => pct > 30 ? '#ef4444' : pct > 15 ? '#f97316' : '#22c55e';

  const horizonButtons: Array<{ key: '6m' | '12m' | '24m'; label: string }> = [
    { key: '6m',  label: t('bankruptcy.btn6m') },
    { key: '12m', label: t('bankruptcy.btn12m') },
    { key: '24m', label: t('bankruptcy.btn24m') },
  ];

  return (
    <div className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
      <button
        className="w-full flex items-center gap-3 py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors text-left"
        onClick={() => setOpen(o => !o)}>
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 flex-shrink-0 ${zoneDotClass(cfg.color)}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              {new Date(p.created_at).toLocaleString(i18n.language, { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
            </p>
            <span className={`text-[9px] rounded-full border px-1.5 py-0.5 font-medium ${cfg.text} ${cfg.border}`}>
              Z = {Number(p.z_score).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400">
            <span>6m: <b className={probTextClass(p.probability_6m)}>{p.probability_6m}%</b></span>
            <span>12m: <b className={probTextClass(p.probability_12m)}>{p.probability_12m}%</b></span>
            <span>24m: <b className={probTextClass(p.probability_24m)}>{p.probability_24m}%</b></span>
            {p.score_trend_3m !== null && (
              <span className={p.score_trend_3m < 0 ? 'text-red-500' : 'text-green-500'}>
                {p.score_trend_3m > 0 ? '↑' : '↓'} {Math.abs(p.score_trend_3m)} pts
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-300 shrink-0" />
               : <ChevronDown className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
      </button>

      {open && (
        <div className="pb-3 px-1 space-y-3">
          <ZScoreGauge z={Number(p.z_score)} zone={p.risk_zone} />

          <div className="flex gap-1">
            {horizonButtons.map(({ key, label }) => (
              <button key={key}
                className={`flex-1 text-xs py-1 rounded-lg border transition-colors ${
                  horizon === key
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setHorizon(key)}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {horizon === '6m'  && <ProbBar label={t('bankruptcy.probDefault6m')}  pct={p.probability_6m}  color={probColor(p.probability_6m)} />}
            {horizon === '12m' && <ProbBar label={t('bankruptcy.probDefault12m')} pct={p.probability_12m} color={probColor(p.probability_12m)} />}
            {horizon === '24m' && <ProbBar label={t('bankruptcy.probDefault24m')} pct={p.probability_24m} color={probColor(p.probability_24m)} />}
          </div>

          {narratives[horizon] && (
            <div className={`rounded-lg border p-2.5 text-xs leading-relaxed ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              {narratives[horizon]}
            </div>
          )}

          {p.key_risk_factors.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                {t('bankruptcy.keyFactors')}
              </p>
              {p.key_risk_factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2 py-1 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                  <span className={`text-[9px] rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 font-medium ${IMPACT_CLS[f.impact]}`}>
                    {t(`bankruptcy.impact${f.impact.charAt(0).toUpperCase() + f.impact.slice(1)}`)}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{f.factor}</p>
                    <p className="text-[10px] text-gray-400">{f.mitigation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {p.early_warning_signals.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {t('bankruptcy.earlyWarnings')}
              </p>
              {p.early_warning_signals.map((s, i) => (
                <p key={i} className="text-[10px] text-gray-500 flex items-start gap-1 py-0.5">
                  <span className="text-orange-400 shrink-0">⚠</span>{s}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

interface Props {
  supplierId:  string;
  predictions: BankruptcyPrediction[];
}

export function BankruptcyPanel({ supplierId, predictions: initialPredictions }: Props) {
  const { t } = useTranslation('vendorshield');
  const [isPending, startTransition] = useTransition();
  const [result, setResult]          = useState<PredictionResult | null>(null);
  const [preds, setPreds]            = useState<BankruptcyPrediction[]>(initialPredictions);

  const latestZone = preds[0]?.risk_zone;
  const cfg        = latestZone ? ZONE_CFG[latestZone] : null;

  const handleRun = () => {
    setResult(null);
    startTransition(async () => {
      const r = await triggerBankruptcyPredictionAction(supplierId);
      setResult(r);
      if (r.success) {
        setPreds(prev => [{
          id:                    r.prediction_id!,
          supplier_id:           supplierId,
          z_score:               r.z_score!,
          risk_zone:             r.risk_zone!,
          component_credit:      null, component_debt: null,
          component_revenue:     null, component_payments: null,
          component_profitability: null, component_operational: null,
          component_geopolitical: null,
          probability_6m:        r.probability_6m!,
          probability_12m:       r.probability_12m!,
          probability_24m:       r.probability_24m!,
          score_trend_3m:        null,
          assessment_count:      0,
          narrative_6m:          null, narrative_12m: null, narrative_24m: null,
          key_risk_factors:      [],
          early_warning_signals: [],
          model_used:            r.mock_mode ? 'mock' : 'llama-3.3-70b-versatile',
          created_at:            new Date().toISOString(),
        }, ...prev]);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg p-1.5 bg-indigo-50 dark:bg-indigo-950">
              <Brain className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{t('bankruptcy.title')}</CardTitle>
              <CardDescription className="text-[10px]">
                {t('bankruptcy.subtitle')}
              </CardDescription>
            </div>
          </div>
          {cfg && (
            <span className={`text-[10px] font-medium rounded-full border px-2 py-0.5 ${cfg.text} ${cfg.border} ${cfg.bg}`}>
              {t(`bankruptcy.zone${latestZone!.charAt(0).toUpperCase() + latestZone!.slice(1)}`)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Button onClick={handleRun} disabled={isPending} className="w-full gap-2" size="sm">
          {isPending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>{t('bankruptcy.analyzing')}</>
            : <><Zap className="h-3.5 w-3.5"/>{t('bankruptcy.runButton')}</>
          }
        </Button>

        {isPending && (
          <div className="flex items-center gap-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0"/>
            <div>
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{t('bankruptcy.calculatingZ')}</p>
              <p className="text-xs text-indigo-500 mt-0.5">{t('bankruptcy.calculating3Horizons')}</p>
            </div>
          </div>
        )}

        {result && !isPending && <PredictionResultCard result={result} />}

        {preds.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {t('bankruptcy.historyTitle')}
            </p>
            {preds.slice(0, 4).map(p => <PredictionDetail key={p.id} p={p} />)}
          </div>
        ) : !result && !isPending ? (
          <div className="py-4 text-center">
            <Brain className="h-7 w-7 text-gray-200 dark:text-gray-700 mx-auto mb-1.5"/>
            <p className="text-xs text-gray-400">{t('bankruptcy.noPredictions')}</p>
          </div>
        ) : null}

        <p className="text-[9px] text-gray-300 dark:text-gray-700 text-center">
          {t('bankruptcy.footer')}
        </p>
      </CardContent>
    </Card>
  );
}
