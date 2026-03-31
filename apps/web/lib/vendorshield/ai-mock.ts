/**
 * VendorShield — Mock IA pour le développement local
 * Logique déterministe basée sur les données réelles du fournisseur.
 * Utilisé quand MOCK_AI=true pour éviter tout appel réseau.
 */

import type { AiAnalysis } from './actions/ai.actions';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RiskSignal {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  confidence: number;
  source_hint?: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
}

interface SupplierData {
  name: string;
  country_code: string | null;
  country_name: string | null;
  category: string;
  criticality: string;
  global_score: number | null;
  financial_score: number | null;
  operational_score: number | null;
  geopolitical_score: number | null;
  esg_score: number | null;
  is_sole_source: boolean;
  notes: string | null;
}

// ─── Pays à risque ────────────────────────────────────────────────────────────

const HIGH_RISK = new Set(['RU', 'KP', 'BY', 'IR', 'SY', 'CU', 'VE', 'MM']);
const MEDIUM_RISK = new Set(['CN', 'TR', 'PK', 'BD', 'NG', 'ZW', 'UZ', 'TJ']);

// ─── Génération mock déterministe ─────────────────────────────────────────────

export function generateMockAnalysis(supplier: SupplierData): {
  overall_assessment: string;
  confidence_score: number;
  risk_signals: RiskSignal[];
  recommendations: Recommendation[];
} {
  const signals: RiskSignal[] = [];
  const recommendations: Recommendation[] = [];
  const score = supplier.global_score ?? 50;
  const cc    = supplier.country_code ?? '';

  // ── Score financier ──
  const finScore = supplier.financial_score ?? score;
  if (finScore < 40) {
    signals.push({
      type:        'financial',
      severity:    finScore < 25 ? 'critical' : 'warning',
      title:       `Score financier dégradé — ${supplier.name}`,
      description: `Le score financier de ${finScore}/100 indique des fragilités significatives. ` +
                   `Vérifier la solvabilité, le ratio d'endettement et la stabilité du CA.`,
      confidence:  88,
      source_hint: 'Bilan financier, rapport D&B',
    });
    recommendations.push({
      priority: finScore < 25 ? 'high' : 'medium',
      action:   'Demander les derniers états financiers audités (bilan + compte de résultat)',
      rationale: 'Score financier sous le seuil critique — risque de défaillance à surveiller',
    });
  }

  // ── Risque géopolitique ──
  if (HIGH_RISK.has(cc)) {
    signals.push({
      type:        'geopolitical',
      severity:    'critical',
      title:       `Exposition sanctions — ${supplier.country_name ?? cc}`,
      description: `Le pays d'origine est soumis à des sanctions internationales (UE/OFAC/ONU). ` +
                   `Vérification de conformité légale obligatoire avant toute transaction.`,
      confidence:  97,
      source_hint: 'Listes OFAC, sanctions UE, ONU',
    });
    recommendations.push({
      priority: 'high',
      action:   'Effectuer un screening sanctions complet et consulter le service juridique',
      rationale: 'Exposition directe aux régimes de sanctions — risque juridique et pénal',
    });
  } else if (MEDIUM_RISK.has(cc) || (supplier.geopolitical_score ?? score) < 45) {
    signals.push({
      type:        'geopolitical',
      severity:    'warning',
      title:       `Risque géopolitique modéré — ${supplier.country_name ?? cc}`,
      description: `Contexte géopolitique instable ou tensions commerciales dans le pays du fournisseur. ` +
                   `Score géopolitique : ${supplier.geopolitical_score ?? 'N/A'}/100.`,
      confidence:  72,
      source_hint: 'OCDE country risk, actualités commerciales',
    });
  }

  // ── Score opérationnel ──
  const opsScore = supplier.operational_score ?? score;
  if (opsScore < 40) {
    signals.push({
      type:        'operational',
      severity:    'warning',
      title:       'Performance opérationnelle insuffisante',
      description: `Score opérationnel de ${opsScore}/100. Risques identifiés sur la fiabilité ` +
                   `des livraisons, les certifications qualité ou la capacité de production.`,
      confidence:  80,
      source_hint: 'Historique livraisons, certifications ISO',
    });
  }

  // ── Sole source ──
  if (supplier.is_sole_source) {
    signals.push({
      type:        'operational',
      severity:    score < 50 ? 'critical' : 'warning',
      title:       'Dépendance sole source — aucune alternative',
      description: `Ce fournisseur est identifié comme unique pour ce besoin. ` +
                   `Toute défaillance entraînerait un arrêt sans substitution immédiate possible.`,
      confidence:  100,
    });
    recommendations.push({
      priority: score < 50 ? 'high' : 'medium',
      action:   'Qualifier 1 à 2 fournisseurs alternatifs sous 90 jours',
      rationale: 'Dépendance unique incompatible avec la résilience supply chain',
    });
  }

  // ── ESG ──
  const esgScore = supplier.esg_score ?? score;
  if (esgScore < 40) {
    signals.push({
      type:        'esg',
      severity:    'warning',
      title:       'Non-conformité ESG potentielle',
      description: `Score ESG de ${esgScore}/100. Des lacunes en matière de conformité ` +
                   `environnementale, de pratiques sociales ou d'anti-corruption sont possibles.`,
      confidence:  70,
      source_hint: 'Audit ESG, rapport EcoVadis, devoir de vigilance',
    });
  }

  // ── Fournisseur sain ──
  if (signals.length === 0) {
    signals.push({
      type:        'operational',
      severity:    'info',
      title:       'Profil de risque satisfaisant',
      description: `Score global de ${score}/100. Aucun signal critique identifié. ` +
                   `Maintenir le suivi régulier et renouveler l'évaluation annuellement.`,
      confidence:  80,
    });
    recommendations.push({
      priority: 'low',
      action:   'Planifier la prochaine évaluation annuelle',
      rationale: 'Maintenir la fraîcheur des données de risque',
    });
  }

  const hasCritical = signals.some((s) => s.severity === 'critical');
  const hasWarning  = signals.some((s) => s.severity === 'warning');

  const overall = hasCritical
    ? `Fournisseur à risque élevé nécessitant une attention immédiate. ` +
      `${signals.filter((s) => s.severity === 'critical').map((s) => s.title).join(', ')}.`
    : hasWarning
    ? `Fournisseur présentant des risques modérés à surveiller. ` +
      `${signals.length} signal(s) identifié(s) requérant un suivi.`
    : `Profil de risque globalement satisfaisant. La situation reste sous contrôle.`;

  return {
    overall_assessment: overall,
    confidence_score:   72,
    risk_signals:       signals.slice(0, 5),
    recommendations:    recommendations.slice(0, 4),
  };
}
