'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Info,
  Loader2,
  Shield,
  TrendingUp,
  Zap,
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
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Progress } from '@kit/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import {
  computeAssessmentScoresAction,
  createAssessmentAction,
  finalizeAssessmentAction,
  updateFactorScoresAction,
} from '~/lib/vendorshield/actions/assessment.actions';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';
import type { ScoringTemplate, Supplier } from '~/lib/vendorshield/types';
import type { RiskDimension } from '~/lib/vendorshield/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FactorScore {
  factor_id: string;
  factor_key: string;
  factor_label: string;
  score: number;
  evidence: string;
  weight: number;
}

interface DimensionScores {
  financial: FactorScore[];
  operational: FactorScore[];
  geopolitical: FactorScore[];
  esg: FactorScore[];
}

// ─── Static factor metadata (key + weight only; labels resolved via i18n) ────

const FACTOR_META: Record<RiskDimension, { key: string; weight: number }[]> = {
  financial: [
    { key: 'credit_rating',          weight: 3 },
    { key: 'payment_delays',         weight: 2 },
    { key: 'revenue_stability',      weight: 2 },
    { key: 'debt_ratio',             weight: 2 },
    { key: 'customer_concentration', weight: 2 },
    { key: 'profitability',          weight: 2 },
  ],
  operational: [
    { key: 'delivery_reliability',   weight: 3 },
    { key: 'quality_certifications', weight: 3 },
    { key: 'capacity_flexibility',   weight: 2 },
    { key: 'substitutability',       weight: 3 },
    { key: 'it_security',            weight: 2 },
    { key: 'bcp_existence',          weight: 2 },
    { key: 'subcontractor_risk',     weight: 2 },
  ],
  geopolitical: [
    { key: 'country_risk',           weight: 4 },
    { key: 'sanctions_exposure',     weight: 4 },
    { key: 'trade_restrictions',     weight: 3 },
    { key: 'currency_risk',          weight: 2 },
    { key: 'infrastructure',         weight: 2 },
  ],
  esg: [
    { key: 'carbon_footprint',        weight: 3 },
    { key: 'labor_practices',         weight: 3 },
    { key: 'human_rights',            weight: 3 },
    { key: 'corruption_bribery',      weight: 3 },
    { key: 'environmental_compliance',weight: 2 },
    { key: 'data_privacy',            weight: 2 },
  ],
};

// ─── Score guide thresholds (factor key → score → i18n key suffix) ───────────

const GUIDE_THRESHOLDS: Record<string, number[]> = {
  credit_rating:        [0, 25, 50, 75, 100],
  delivery_reliability: [0, 25, 50, 75, 100],
  substitutability:     [0, 25, 50, 75, 100],
  country_risk:         [0, 25, 50, 75, 100],
  sanctions_exposure:   [0, 25, 50, 75, 100],
  labor_practices:      [0, 25, 50, 75, 100],
  human_rights:         [0, 25, 50, 75, 100],
};

function getGuideKey(factorKey: string, score: number): string | null {
  const thresholds = GUIDE_THRESHOLDS[factorKey];
  if (!thresholds) return null;
  const closest = thresholds.reduce((prev, curr) =>
    Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev,
  );
  return `assessment.guide.${factorKey}_${closest}`;
}

// ─── Slider component ──────────────────────────────────────────────────────────

function FactorScoreSlider({
  factor,
  value,
  evidence,
  guideText,
  sliderMin,
  sliderMax,
  evidencePlaceholder,
  onChange,
  onEvidenceChange,
}: {
  factor: { key: string; label: string; weight: number };
  value: number;
  evidence: string;
  guideText: string;
  sliderMin: string;
  sliderMax: string;
  evidencePlaceholder: string;
  onChange: (score: number) => void;
  onEvidenceChange: (text: string) => void;
}) {
  const color =
    value >= 70 ? 'text-green-600' : value >= 40 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{factor.label}</p>
          {guideText && (
            <p className="mt-0.5 text-xs text-gray-400 italic">{guideText}</p>
          )}
        </div>
        <div className={`text-xl font-bold tabular-nums shrink-0 ${color}`}>{value}</div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
          style={{
            background: `linear-gradient(to right, ${
              value >= 70 ? '#22c55e' : value >= 40 ? '#f97316' : '#ef4444'
            } ${value}%, #e5e7eb ${value}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
          <span>{sliderMin}</span>
          <span>50</span>
          <span>{sliderMax}</span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[0, 25, 50, 75, 100].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
              value === v
                ? 'bg-primary text-white'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <Textarea
        placeholder={evidencePlaceholder}
        value={evidence}
        onChange={(e) => onEvidenceChange(e.target.value)}
        className="resize-none text-xs min-h-0"
        rows={2}
      />
    </div>
  );
}

// ─── Dimension score calculation ──────────────────────────────────────────────

function calcDimensionScore(factors: FactorScore[]): number {
  if (factors.length === 0) return 0;
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
}

// ─── Dimension steps ──────────────────────────────────────────────────────────

const DIMENSION_STEPS: { dim: RiskDimension; icon: React.ReactNode; color: string }[] = [
  { dim: 'financial',    icon: <TrendingUp className="h-4 w-4" />,   color: 'text-blue-600 bg-blue-50' },
  { dim: 'operational',  icon: <Zap className="h-4 w-4" />,          color: 'text-orange-600 bg-orange-50' },
  { dim: 'geopolitical', icon: <Globe className="h-4 w-4" />,        color: 'text-purple-600 bg-purple-50' },
  { dim: 'esg',          icon: <Shield className="h-4 w-4" />,       color: 'text-green-600 bg-green-50' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  suppliers: Pick<Supplier, 'id' | 'name' | 'country_code' | 'category' | 'global_score' | 'risk_level'>[];
  templates: ScoringTemplate[];
  preselectedSupplierId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssessmentWizard({ suppliers, templates, preselectedSupplierId }: Props) {
  const { t } = useTranslation('vendorshield');
  const { categoryLabels, dimensionLabels } = useEnumLabels();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [factorIds, setFactorIds] = useState<Record<string, string>>({});

  const [config, setConfig] = useState({
    supplier_id: preselectedSupplierId ?? '',
    title: '',
    assessment_date: new Date().toISOString().split('T')[0],
    next_review_date: '',
    weight_financial: 30,
    weight_operational: 30,
    weight_geopolitical: 20,
    weight_esg: 20,
    template_id: '',
  });

  const [scores, setScores] = useState<DimensionScores>(() => {
    const init: DimensionScores = { financial: [], operational: [], geopolitical: [], esg: [] };
    for (const [dim, factors] of Object.entries(FACTOR_META) as [RiskDimension, typeof FACTOR_META[RiskDimension]][]) {
      init[dim] = factors.map((f) => ({
        factor_id: '',
        factor_key: f.key,
        factor_label: f.key,
        score: 50,
        evidence: '',
        weight: f.weight,
      }));
    }
    return init;
  });

  const previewScores = {
    financial:    calcDimensionScore(scores.financial),
    operational:  calcDimensionScore(scores.operational),
    geopolitical: calcDimensionScore(scores.geopolitical),
    esg:          calcDimensionScore(scores.esg),
  };
  const previewGlobal = Math.round(
    (previewScores.financial    * config.weight_financial +
     previewScores.operational  * config.weight_operational +
     previewScores.geopolitical * config.weight_geopolitical +
     previewScores.esg          * config.weight_esg) / 100
  );

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setConfig((c) => ({
      ...c,
      template_id: templateId,
      weight_financial:    tpl.weight_financial,
      weight_operational:  tpl.weight_operational,
      weight_geopolitical: tpl.weight_geopolitical,
      weight_esg:          tpl.weight_esg,
    }));
  };

  const updateScore = useCallback(
    (dim: RiskDimension, factorKey: string, score: number) => {
      setScores((prev) => ({
        ...prev,
        [dim]: prev[dim].map((f) =>
          f.factor_key === factorKey ? { ...f, score } : f,
        ),
      }));
    },
    [],
  );

  const updateEvidence = useCallback(
    (dim: RiskDimension, factorKey: string, evidence: string) => {
      setScores((prev) => ({
        ...prev,
        [dim]: prev[dim].map((f) =>
          f.factor_key === factorKey ? { ...f, evidence } : f,
        ),
      }));
    },
    [],
  );

  const totalSteps = 6;

  const handleCreateAssessment = () => {
    setError(null);
    if (!config.supplier_id) { setError(t('assessment.errorNoSupplier')); return; }
    if (!config.title.trim()) { setError(t('assessment.errorNoTitle')); return; }
    const weightSum = config.weight_financial + config.weight_operational + config.weight_geopolitical + config.weight_esg;
    if (weightSum !== 100) { setError(t('assessment.errorWeights')); return; }

    const fd = new FormData();
    fd.set('supplier_id', config.supplier_id);
    fd.set('title', config.title);
    fd.set('assessment_date', config.assessment_date ?? '');
    fd.set('next_review_date', config.next_review_date ?? '');
    fd.set('weight_financial', String(config.weight_financial));
    fd.set('weight_operational', String(config.weight_operational));
    fd.set('weight_geopolitical', String(config.weight_geopolitical));
    fd.set('weight_esg', String(config.weight_esg));

    startTransition(async () => {
      const result = await createAssessmentAction(fd);
      if (!result.success) { setError(result.error); return; }

      const { getSupabaseBrowserClient } = await import('@kit/supabase/browser-client');
      const client = getSupabaseBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (client as any)
        .from('risk_factors')
        .select('id, factor_key')
        .eq('assessment_id', result.data.id);

      if (data) {
        const ids: Record<string, string> = {};
        for (const row of data) ids[row.factor_key] = row.id;
        setFactorIds(ids);

        setScores((prev) => {
          const next = { ...prev };
          for (const [dim, factors] of Object.entries(next) as [RiskDimension, FactorScore[]][]) {
            next[dim] = factors.map((f) => ({
              ...f,
              factor_id: ids[f.factor_key] ?? f.factor_id,
            }));
          }
          return next;
        });
      }

      setAssessmentId(result.data.id);
      setStep(1);
    });
  };

  const handleSaveDimensionAndNext = (dim: RiskDimension) => {
    if (!assessmentId) return;
    const dimFactors = scores[dim];

    startTransition(async () => {
      setError(null);
      const result = await updateFactorScoresAction(
        assessmentId,
        dimFactors.map((f) => ({
          factor_id: f.factor_id,
          score: f.score,
          evidence: f.evidence || undefined,
        })),
      );
      if (!result.success) { setError(result.error); return; }
      setStep((s) => s + 1);
    });
  };

  const [synthNotes, setSynthNotes] = useState({ analyst_notes: '', executive_summary: '', mitigation_plan: '' });

  const handleFinalize = () => {
    if (!assessmentId) return;
    const fd = new FormData();
    fd.set('analyst_notes', synthNotes.analyst_notes);
    fd.set('executive_summary', synthNotes.executive_summary);
    fd.set('mitigation_plan', synthNotes.mitigation_plan);

    startTransition(async () => {
      setError(null);
      await finalizeAssessmentAction(assessmentId, fd);
    });
  };

  const currentDimStep = step >= 1 && step <= 4 ? DIMENSION_STEPS[step - 1] : null;
  const currentDimKey  = currentDimStep?.dim ?? null;

  const stepLabels = [
    t('assessment.stepConfig'),
    t('dashboard.dimFinancial'),
    t('dashboard.dimOperational'),
    t('dashboard.dimGeopolitical'),
    t('dashboard.dimEsg'),
    t('assessment.stepSummary'),
  ];

  const weightDimensions = [
    { key: 'weight_financial' as const,    label: t('dashboard.dimFinancial') },
    { key: 'weight_operational' as const,  label: t('dashboard.dimOperational') },
    { key: 'weight_geopolitical' as const, label: t('dashboard.dimGeopolitical') },
    { key: 'weight_esg' as const,          label: t('dashboard.dimEsg') },
  ];

  const sliderMin = t('assessment.sliderMin');
  const sliderMax = t('assessment.sliderMax');
  const evidencePlaceholder = t('assessment.evidencePlaceholder');

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{t('assessment.stepOf', { current: step + 1, total: totalSteps })}</span>
          <span>{Math.round(((step) / (totalSteps - 1)) * 100)}%</span>
        </div>
        <Progress value={Math.round((step / (totalSteps - 1)) * 100)} className="h-2" />
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 rounded-full w-full transition-colors ${i < step ? 'bg-primary' : i === step ? 'bg-primary/50' : 'bg-gray-200 dark:bg-gray-800'}`} />
              <span className={`text-[10px] hidden sm:block truncate ${i === step ? 'text-primary font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── STEP 0 — Configuration ── */}
      {step === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('assessment.paramsTitle')}</CardTitle>
              <CardDescription>{t('assessment.paramsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  {t('assessment.labelSupplier')} <span className="text-red-500">*</span>
                </Label>
                <Select value={config.supplier_id} onValueChange={(v) => setConfig((c) => ({ ...c, supplier_id: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={t('assessment.supplierPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          {s.country_code && <span>{countryFlag(s.country_code)}</span>}
                          <span>{s.name}</span>
                          <span className="text-xs text-gray-400">— {categoryLabels[s.category]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  {t('assessment.labelTitle')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="mt-1.5"
                  placeholder={`Assessment ${new Date().getFullYear()}`}
                  value={config.title}
                  onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('assessment.labelDate')}</Label>
                  <Input type="date" className="mt-1.5" value={config.assessment_date} onChange={(e) => setConfig((c) => ({ ...c, assessment_date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('assessment.labelNextReview')}</Label>
                  <Input type="date" className="mt-1.5" value={config.next_review_date} onChange={(e) => setConfig((c) => ({ ...c, next_review_date: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('assessment.weightsTitle')}</CardTitle>
              <CardDescription>{t('assessment.weightsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('assessment.templateLabel')}</Label>
                <Select value={config.template_id} onValueChange={applyTemplate}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={t('assessment.templatePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                        {tmpl.industry && <span className="ml-1 text-xs text-gray-400">— {tmpl.industry}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {weightDimensions.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-gray-600 dark:text-gray-400 shrink-0">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={config[key]}
                      onChange={(e) => setConfig((c) => ({ ...c, [key]: parseInt(e.target.value, 10) }))}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                      {config[key]}%
                    </span>
                  </div>
                ))}

                {(() => {
                  const total = config.weight_financial + config.weight_operational + config.weight_geopolitical + config.weight_esg;
                  const ok = total === 100;
                  return (
                    <div className={`flex items-center justify-end gap-2 pt-1 text-sm font-medium ${ok ? 'text-green-600' : 'text-red-600'}`}>
                      {t('assessment.weightTotal')} : {total}%
                      {ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleCreateAssessment} disabled={isPending} size="lg">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending ? t('assessment.btnStarting') : t('assessment.btnStart')}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEPS 1-4 — Dimension scoring ── */}
      {step >= 1 && step <= 4 && currentDimStep && currentDimKey && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${currentDimStep.color}`}>
              {currentDimStep.icon}
              <span className="text-sm font-semibold">{dimensionLabels[currentDimKey]}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                {previewScores[currentDimKey]}
                <span className="text-sm font-normal text-gray-400">/100</span>
              </div>
              <div className="text-xs text-gray-400">{t('assessment.scorePreview')}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{t('assessment.riskHint')}</span>
          </div>

          <div className="space-y-3">
            {scores[currentDimKey].map((factor) => {
              const guideKey = getGuideKey(factor.factor_key, factor.score);
              const guideText = guideKey ? t(guideKey) : '';
              const factorLabel = t(`assessment.factor.${factor.factor_key}`, { defaultValue: factor.factor_key });
              return (
                <FactorScoreSlider
                  key={factor.factor_key}
                  factor={{ key: factor.factor_key, label: factorLabel, weight: factor.weight }}
                  value={factor.score}
                  evidence={factor.evidence}
                  guideText={guideText}
                  sliderMin={sliderMin}
                  sliderMax={sliderMax}
                  evidencePlaceholder={evidencePlaceholder}
                  onChange={(score) => updateScore(currentDimKey, factor.factor_key, score)}
                  onEvidenceChange={(evidence) => updateEvidence(currentDimKey, factor.factor_key, evidence)}
                />
              );
            })}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isPending}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('assessment.btnPrev')}
            </Button>
            <Button onClick={() => handleSaveDimensionAndNext(currentDimKey)} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {step < 4 ? t('assessment.btnNextDim') : t('assessment.btnToSummary')}
              {!isPending && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 5 — Summary & finalization ── */}
      {step === 5 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('assessment.summaryTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4 lg:grid-cols-4">
                {DIMENSION_STEPS.map(({ dim, icon, color }) => (
                  <div key={dim} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 text-center">
                    <div className={`inline-flex rounded-lg p-1.5 mb-2 ${color}`}>{icon}</div>
                    <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                      {previewScores[dim]}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{dimensionLabels[dim]}</div>
                  </div>
                ))}
              </div>

              <div className={`rounded-xl p-4 text-center ${
                previewGlobal >= 70 ? 'bg-green-50 dark:bg-green-950/30' :
                previewGlobal >= 40 ? 'bg-orange-50 dark:bg-orange-950/30' :
                'bg-red-50 dark:bg-red-950/30'
              }`}>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('assessment.globalScorePreview')}</p>
                <p className={`text-5xl font-bold tabular-nums ${
                  previewGlobal >= 70 ? 'text-green-600' :
                  previewGlobal >= 40 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {previewGlobal}
                  <span className="text-lg font-normal text-gray-400">/100</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {previewGlobal >= 70 ? t('assessment.riskLow') :
                   previewGlobal >= 40 ? t('assessment.riskModerate') :
                   previewGlobal >= 20 ? t('assessment.riskHigh') :
                   t('assessment.riskCritical')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('assessment.notesTitle')}</CardTitle>
              <CardDescription>{t('assessment.notesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('assessment.execSummaryLabel')}</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={2}
                  placeholder={t('assessment.execSummaryPlaceholder')}
                  value={synthNotes.executive_summary}
                  onChange={(e) => setSynthNotes((n) => ({ ...n, executive_summary: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('assessment.analystNotesLabel')}</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={3}
                  placeholder={t('assessment.analystNotesPlaceholder')}
                  value={synthNotes.analyst_notes}
                  onChange={(e) => setSynthNotes((n) => ({ ...n, analyst_notes: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('assessment.mitigationLabel')}</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={3}
                  placeholder={t('assessment.mitigationPlaceholder')}
                  value={synthNotes.mitigation_plan}
                  onChange={(e) => setSynthNotes((n) => ({ ...n, mitigation_plan: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(4)} disabled={isPending}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('assessment.btnPrev')}
            </Button>
            <Button onClick={handleFinalize} disabled={isPending} size="lg">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {isPending ? t('assessment.btnFinalizing') : t('assessment.btnFinalize')}
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
