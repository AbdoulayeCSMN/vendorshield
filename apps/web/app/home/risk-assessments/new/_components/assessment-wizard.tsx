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
import type { ScoringTemplate, Supplier } from '~/lib/vendorshield/types';
import {
  CATEGORY_LABELS,
  DIMENSION_LABELS,
  type RiskDimension,
} from '~/lib/vendorshield/types';

// ─── Types internes ───────────────────────────────────────────────────────────

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

// ─── 24 facteurs par défaut (alignés sur seed_default_risk_factors) ───────────
// IDs seront remplacés par ceux de la DB après création

const DEFAULT_FACTORS: Record<RiskDimension, { key: string; label: string; weight: number }[]> = {
  financial: [
    { key: 'credit_rating',         label: 'Notation de crédit & solvabilité',   weight: 3 },
    { key: 'payment_delays',        label: 'Historique de retards de paiement',  weight: 2 },
    { key: 'revenue_stability',     label: "Stabilité du chiffre d'affaires",    weight: 2 },
    { key: 'debt_ratio',            label: "Niveau d'endettement",               weight: 2 },
    { key: 'customer_concentration',label: 'Concentration client (dépendance)',  weight: 2 },
    { key: 'profitability',         label: 'Rentabilité & marges',               weight: 2 },
  ],
  operational: [
    { key: 'delivery_reliability',  label: 'Fiabilité des délais de livraison',  weight: 3 },
    { key: 'quality_certifications',label: 'Certifications qualité (ISO, etc.)', weight: 3 },
    { key: 'capacity_flexibility',  label: 'Flexibilité et capacité de production', weight: 2 },
    { key: 'substitutability',      label: 'Facilité de substitution fournisseur', weight: 3 },
    { key: 'it_security',           label: 'Sécurité informatique & cyber-risques', weight: 2 },
    { key: 'bcp_existence',         label: "Plan de continuité d'activité (BCP)", weight: 2 },
    { key: 'subcontractor_risk',    label: 'Risque sous-traitants',              weight: 2 },
  ],
  geopolitical: [
    { key: 'country_risk',          label: 'Indice de risque pays (stabilité)',  weight: 4 },
    { key: 'sanctions_exposure',    label: 'Exposition aux sanctions & embargos', weight: 4 },
    { key: 'trade_restrictions',    label: 'Restrictions commerciales & douanières', weight: 3 },
    { key: 'currency_risk',         label: 'Risque de change',                   weight: 2 },
    { key: 'infrastructure',        label: 'Qualité infrastructures transport/énergie', weight: 2 },
  ],
  esg: [
    { key: 'carbon_footprint',      label: 'Empreinte carbone & politique climat', weight: 3 },
    { key: 'labor_practices',       label: 'Conditions & pratiques de travail',  weight: 3 },
    { key: 'human_rights',          label: 'Droits humains (devoir de vigilance)', weight: 3 },
    { key: 'corruption_bribery',    label: 'Anti-corruption & conformité légale', weight: 3 },
    { key: 'environmental_compliance', label: 'Conformité environnementale réglementaire', weight: 2 },
    { key: 'data_privacy',          label: 'Protection des données (RGPD)',      weight: 2 },
  ],
};

// ─── Guides de score (affichés sous le slider) ────────────────────────────────

const SCORE_GUIDES: Record<string, Record<number, string>> = {
  credit_rating:          { 0: 'Défaut / liquidation', 25: 'Risque très élevé (C)', 50: 'Risque élevé (B)', 75: 'Risque modéré (BB)', 100: 'Risque minimal (AA-AAA)' },
  delivery_reliability:   { 0: 'OTD < 60%', 25: 'OTD 60-75%', 50: 'OTD 75-85%', 75: 'OTD 85-95%', 100: 'OTD > 95%' },
  substitutability:       { 0: 'Unique — impossible à remplacer', 25: '1 alternative difficile', 50: '2-3 alternatives avec délai', 75: 'Plusieurs alternatives', 100: 'Substitution immédiate' },
  country_risk:           { 0: 'Zone de conflit armé', 25: 'Risque très élevé', 50: 'Risque élevé', 75: 'Risque modéré', 100: 'Pays OCDE stable' },
  sanctions_exposure:     { 0: 'Entité sanctionnée', 25: 'Surveillance active', 50: 'Exposition indirecte', 75: 'Zone grise', 100: 'Aucune exposition' },
  labor_practices:        { 0: 'Violations graves documentées', 25: 'Non-conformités significatives', 50: 'Conformité basique', 75: 'Bonnes pratiques', 100: 'Certifié SA8000' },
  human_rights:           { 0: 'Violations documentées', 25: 'Risques sans plan', 50: 'Politique partielle', 75: 'Dispositif solide', 100: 'Référence sectorielle' },
};

function getScoreGuide(factorKey: string, score: number): string {
  const guide = SCORE_GUIDES[factorKey];
  if (!guide) return '';
  const thresholds = Object.keys(guide).map(Number).sort((a, b) => a - b);
  const closest = thresholds.reduce((prev, curr) =>
    Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev,
  );
  return guide[closest] ?? '';
}

// ─── Composant slider de score ────────────────────────────────────────────────

function FactorScoreSlider({
  factor,
  value,
  evidence,
  onChange,
  onEvidenceChange,
}: {
  factor: { key: string; label: string; weight: number };
  value: number;
  evidence: string;
  onChange: (score: number) => void;
  onEvidenceChange: (text: string) => void;
}) {
  const color =
    value >= 70 ? 'text-green-600' : value >= 40 ? 'text-orange-600' : 'text-red-600';
  const guide = getScoreGuide(factor.key, value);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{factor.label}</p>
          {guide && (
            <p className="mt-0.5 text-xs text-gray-400 italic">{guide}</p>
          )}
        </div>
        <div className={`text-xl font-bold tabular-nums shrink-0 ${color}`}>
          {value}
        </div>
      </div>

      {/* Slider HTML natif */}
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
          <span>0 — Risque max</span>
          <span>50</span>
          <span>100 — Risque min</span>
        </div>
      </div>

      {/* Boutons de sélection rapide */}
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

      {/* Evidence */}
      <Textarea
        placeholder="Justification, source de données... (optionnel)"
        value={evidence}
        onChange={(e) => onEvidenceChange(e.target.value)}
        className="resize-none text-xs min-h-0"
        rows={2}
      />
    </div>
  );
}

// ─── Calcul du score de dimension ────────────────────────────────────────────

function calcDimensionScore(factors: FactorScore[]): number {
  if (factors.length === 0) return 0;
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
}

// ─── Étapes du wizard ─────────────────────────────────────────────────────────

const DIMENSION_STEPS: { dim: RiskDimension; icon: React.ReactNode; color: string }[] = [
  { dim: 'financial',    icon: <TrendingUp className="h-4 w-4" />,   color: 'text-blue-600 bg-blue-50' },
  { dim: 'operational',  icon: <Zap className="h-4 w-4" />,          color: 'text-orange-600 bg-orange-50' },
  { dim: 'geopolitical', icon: <Globe className="h-4 w-4" />,        color: 'text-purple-600 bg-purple-50' },
  { dim: 'esg',          icon: <Shield className="h-4 w-4" />,       color: 'text-green-600 bg-green-50' },
];

// Step 0 = config, Steps 1-4 = dimensions, Step 5 = synthèse

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  suppliers: Pick<Supplier, 'id' | 'name' | 'country_code' | 'category' | 'global_score' | 'risk_level'>[];
  templates: ScoringTemplate[];
  preselectedSupplierId?: string;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AssessmentWizard({ suppliers, templates, preselectedSupplierId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── State de l'étape courante ──
  const [step, setStep] = useState(0); // 0=config, 1-4=dimensions, 5=synthèse
  const [error, setError] = useState<string | null>(null);

  // ── State de l'évaluation créée ──
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [factorIds, setFactorIds] = useState<Record<string, string>>({}); // key → uuid DB

  // ── Step 0 : configuration ──
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

  // ── State des scores par dimension ──
  const [scores, setScores] = useState<DimensionScores>(() => {
    const init: DimensionScores = { financial: [], operational: [], geopolitical: [], esg: [] };
    for (const [dim, factors] of Object.entries(DEFAULT_FACTORS) as [RiskDimension, typeof DEFAULT_FACTORS[RiskDimension]][]) {
      init[dim] = factors.map((f) => ({
        factor_id: '',
        factor_key: f.key,
        factor_label: f.label,
        score: 50,
        evidence: '',
        weight: f.weight,
      }));
    }
    return init;
  });

  // ── Score prévisionnels globaux ──
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

  // ── Appliquer un template ──
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

  // ── Mise à jour d'un score ──
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

  // ─── Passage Step 0 → Step 1 : créer l'évaluation en DB ──────────────────

  const handleCreateAssessment = () => {
    setError(null);
    if (!config.supplier_id) { setError('Veuillez sélectionner un fournisseur.'); return; }
    if (!config.title.trim()) { setError('Veuillez saisir un titre.'); return; }
    if (config.weight_financial + config.weight_operational + config.weight_geopolitical + config.weight_esg !== 100) {
      setError('Les pondérations doivent totaliser 100 %.');
      return;
    }

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

      // Récupérer les IDs des facteurs créés par seed_default_risk_factors
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

        // Injecter les IDs dans les scores
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

  // ─── Sauvegarde d'une dimension et passage à la suivante ─────────────────

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

  // ─── Finalisation ────────────────────────────────────────────────────────

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
      // redirect() est appelé dans l'action — ce code ne s'exécute pas
    });
  };

  // ─── Rendu par étape ──────────────────────────────────────────────────────

  const currentDimStep = step >= 1 && step <= 4 ? DIMENSION_STEPS[step - 1] : null;
  const currentDimKey  = currentDimStep?.dim ?? null;

  return (
    <div className="space-y-6">
      {/* ── Progress bar ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Étape {step + 1} sur {totalSteps}</span>
          <span>{Math.round(((step) / (totalSteps - 1)) * 100)}%</span>
        </div>
        <Progress value={Math.round((step / (totalSteps - 1)) * 100)} className="h-2" />
        {/* Indicateurs d'étapes */}
        <div className="flex items-center gap-1">
          {['Configuration', 'Financier', 'Opérationnel', 'Géopolitique', 'ESG', 'Synthèse'].map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 rounded-full w-full transition-colors ${i < step ? 'bg-primary' : i === step ? 'bg-primary/50' : 'bg-gray-200 dark:bg-gray-800'}`} />
              <span className={`text-[10px] hidden sm:block truncate ${i === step ? 'text-primary font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Erreur globale ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* STEP 0 — Configuration                                         */}
      {/* ────────────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paramètres de l'évaluation</CardTitle>
              <CardDescription>Sélectionnez le fournisseur et configurez les pondérations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fournisseur */}
              <div>
                <Label className="text-sm font-medium">Fournisseur <span className="text-red-500">*</span></Label>
                <Select value={config.supplier_id} onValueChange={(v) => setConfig((c) => ({ ...c, supplier_id: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choisir un fournisseur actif..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          {s.country_code && <span>{countryFlag(s.country_code)}</span>}
                          <span>{s.name}</span>
                          <span className="text-xs text-gray-400">— {CATEGORY_LABELS[s.category]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Titre */}
              <div>
                <Label className="text-sm font-medium">Titre de l'évaluation <span className="text-red-500">*</span></Label>
                <Input
                  className="mt-1.5"
                  placeholder={`Évaluation risque ${new Date().getFullYear()}`}
                  value={config.title}
                  onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date d'évaluation</Label>
                  <Input type="date" className="mt-1.5" value={config.assessment_date} onChange={(e) => setConfig((c) => ({ ...c, assessment_date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Prochaine révision</Label>
                  <Input type="date" className="mt-1.5" value={config.next_review_date} onChange={(e) => setConfig((c) => ({ ...c, next_review_date: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template & pondérations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pondérations des dimensions</CardTitle>
              <CardDescription>Choisissez un template sectoriel ou personnalisez les pondérations (total = 100%).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template */}
              <div>
                <Label className="text-sm font-medium">Template sectoriel</Label>
                <Select value={config.template_id} onValueChange={applyTemplate}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choisir un template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.industry && <span className="ml-1 text-xs text-gray-400">— {t.industry}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sliders pondérations */}
              <div className="space-y-3">
                {(
                  [
                    { key: 'weight_financial',    label: 'Financier',      color: 'accent-blue-500' },
                    { key: 'weight_operational',   label: 'Opérationnel',   color: 'accent-orange-500' },
                    { key: 'weight_geopolitical',  label: 'Géopolitique',   color: 'accent-purple-500' },
                    { key: 'weight_esg',           label: 'Conformité ESG', color: 'accent-green-500' },
                  ] as const
                ).map(({ key, label }) => (
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

                {/* Total */}
                <div className={`flex items-center justify-end gap-2 pt-1 text-sm font-medium ${
                  config.weight_financial + config.weight_operational + config.weight_geopolitical + config.weight_esg === 100
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  Total : {config.weight_financial + config.weight_operational + config.weight_geopolitical + config.weight_esg}%
                  {config.weight_financial + config.weight_operational + config.weight_geopolitical + config.weight_esg === 100
                    ? <Check className="h-4 w-4" />
                    : <AlertTriangle className="h-4 w-4" />
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleCreateAssessment} disabled={isPending} size="lg">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending ? 'Création...' : 'Commencer l\'évaluation →'}
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* STEPS 1-4 — Scoring par dimension                               */}
      {/* ────────────────────────────────────────────────────────────── */}
      {step >= 1 && step <= 4 && currentDimStep && currentDimKey && (
        <div className="space-y-4">
          {/* En-tête dimension */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${currentDimStep.color}`}>
              {currentDimStep.icon}
              <span className="text-sm font-semibold">{DIMENSION_LABELS[currentDimKey]}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                {previewScores[currentDimKey]}
                <span className="text-sm font-normal text-gray-400">/100</span>
              </div>
              <div className="text-xs text-gray-400">Score prévisnel</div>
            </div>
          </div>

          {/* Info contextuelle */}
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Évaluez chaque critère de 0 (risque maximal) à 100 (risque minimal).
              Le score moyen pondéré déterminera le score de dimension.
            </span>
          </div>

          {/* Facteurs */}
          <div className="space-y-3">
            {scores[currentDimKey].map((factor) => (
              <FactorScoreSlider
                key={factor.factor_key}
                factor={{ key: factor.factor_key, label: factor.factor_label, weight: factor.weight }}
                value={factor.score}
                evidence={factor.evidence}
                onChange={(score) => updateScore(currentDimKey, factor.factor_key, score)}
                onEvidenceChange={(evidence) => updateEvidence(currentDimKey, factor.factor_key, evidence)}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isPending}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Précédent
            </Button>
            <Button
              onClick={() => handleSaveDimensionAndNext(currentDimKey)}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {step < 4 ? 'Dimension suivante' : 'Passer à la synthèse'}
              {!isPending && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* STEP 5 — Synthèse & finalisation                               */}
      {/* ────────────────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-4">
          {/* Récapitulatif des scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Récapitulatif des scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4 lg:grid-cols-4">
                {DIMENSION_STEPS.map(({ dim, icon, color }) => (
                  <div key={dim} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 text-center">
                    <div className={`inline-flex rounded-lg p-1.5 mb-2 ${color}`}>{icon}</div>
                    <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                      {previewScores[dim]}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{DIMENSION_LABELS[dim]}</div>
                  </div>
                ))}
              </div>

              {/* Score global */}
              <div className={`rounded-xl p-4 text-center ${
                previewGlobal >= 70 ? 'bg-green-50 dark:bg-green-950/30' :
                previewGlobal >= 40 ? 'bg-orange-50 dark:bg-orange-950/30' :
                'bg-red-50 dark:bg-red-950/30'
              }`}>
                <p className="text-xs font-medium text-gray-500 mb-1">Score global prévisnel</p>
                <p className={`text-5xl font-bold tabular-nums ${
                  previewGlobal >= 70 ? 'text-green-600' :
                  previewGlobal >= 40 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {previewGlobal}
                  <span className="text-lg font-normal text-gray-400">/100</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Risque {previewGlobal >= 70 ? 'faible' : previewGlobal >= 40 ? 'modéré' : previewGlobal >= 20 ? 'élevé' : 'critique'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes analyste */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes & plan de mitigation</CardTitle>
              <CardDescription>Ces informations enrichissent l'évaluation et peuvent être partagées.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Synthèse exécutive</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={2}
                  placeholder="Résumé des principaux risques identifiés..."
                  value={synthNotes.executive_summary}
                  onChange={(e) => setSynthNotes((n) => ({ ...n, executive_summary: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Notes de l'analyste</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={3}
                  placeholder="Détails, observations, contexte particulier..."
                  value={synthNotes.analyst_notes}
                  onChange={(e) => setSynthNotes((n) => ({ ...n, analyst_notes: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Plan de mitigation</Label>
                <Textarea
                  className="mt-1.5 resize-none"
                  rows={3}
                  placeholder="Actions recommandées pour réduire les risques identifiés..."
                  value={synthNotes.mitigation_plan}
                  onChange={(e) => setSynthNotes((n) => ({ ...n, mitigation_plan: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(4)} disabled={isPending}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Précédent
            </Button>
            <Button onClick={handleFinalize} disabled={isPending} size="lg">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {isPending ? 'Finalisation...' : 'Finaliser l\'évaluation'}
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
