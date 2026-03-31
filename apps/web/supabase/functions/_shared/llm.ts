/**
 * VendorShield — LLM helper partagé
 * Supporte : Groq (gratuit) · Mock dev (zéro API)
 *
 * Variables d'environnement :
 *   GROQ_API_KEY   = clé Groq (console.groq.com → free)
 *   MOCK_AI        = "true" → bypass complet, réponses simulées réalistes
 */

// ─── Types communs ─────────────────────────────────────────────────────────────

export interface RiskSignal {
  type: 'financial' | 'operational' | 'geopolitical' | 'esg' | 'reputational';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  confidence: number;
  source_hint?: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
}

export interface AnalysisResult {
  overall_assessment: string;
  confidence_score: number;
  risk_signals: RiskSignal[];
  recommendations: Recommendation[];
  // Usage tokens (null en mode mock)
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

// ─── Contexte fournisseur passé au LLM ───────────────────────────────────────

export interface SupplierContext {
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
  annual_revenue_eur: number | null;
  employee_count: number | null;
  credit_rating: string | null;
  notes: string | null;
  latest_assessment_summary: string | null;
  open_alerts_count: number;
}

// ─── Prompt système ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert senior en gestion des risques fournisseurs (Supplier Risk Management).
Tu analyses des données contextuelles sur des fournisseurs B2B et identifies les signaux de risque pertinents.

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, selon ce schéma :
{
  "overall_assessment": "synthèse narrative en 2-3 phrases",
  "confidence_score": 75,
  "risk_signals": [
    {
      "type": "financial|operational|geopolitical|esg|reputational",
      "severity": "info|warning|critical",
      "title": "titre court max 80 caractères",
      "description": "description factuelle en 2-3 phrases max",
      "confidence": 80,
      "source_hint": "type de donnée à vérifier"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "action concrète et actionnable",
      "rationale": "justification courte"
    }
  ]
}

Règles strictes :
- Baser l'analyse sur les données fournies uniquement
- Réserver "critical" aux risques avérés ou imminents basés sur les scores/données
- Maximum 5 signaux et 4 recommandations
- Si le fournisseur est sain (score > 70), le dire clairement avec peu de signaux
- Répondre en français`;

// ─── Builder de prompt utilisateur ───────────────────────────────────────────

export function buildPrompt(ctx: SupplierContext): string {
  const lines: string[] = [
    `# Analyse fournisseur : ${ctx.name}`,
    '',
    '## Identité',
    `- Pays : ${ctx.country_name ?? ctx.country_code ?? 'Inconnu'}`,
    `- Secteur : ${ctx.category}`,
    `- Criticité : ${ctx.criticality}`,
    `- Fournisseur unique (sole source) : ${ctx.is_sole_source ? 'OUI ⚠️' : 'Non'}`,
    '',
  ];

  if (ctx.global_score !== null) {
    lines.push('## Scores de risque (0 = risque max, 100 = risque min)');
    lines.push(`- Global : ${ctx.global_score}/100`);
    if (ctx.financial_score !== null)    lines.push(`- Financier : ${ctx.financial_score}/100`);
    if (ctx.operational_score !== null)  lines.push(`- Opérationnel : ${ctx.operational_score}/100`);
    if (ctx.geopolitical_score !== null) lines.push(`- Géopolitique : ${ctx.geopolitical_score}/100`);
    if (ctx.esg_score !== null)          lines.push(`- ESG : ${ctx.esg_score}/100`);
    lines.push('');
  }

  if (ctx.annual_revenue_eur || ctx.employee_count || ctx.credit_rating) {
    lines.push('## Données financières');
    if (ctx.annual_revenue_eur) lines.push(`- CA annuel : ${ctx.annual_revenue_eur.toLocaleString('fr-FR')} €`);
    if (ctx.employee_count)     lines.push(`- Effectif : ${ctx.employee_count} employés`);
    if (ctx.credit_rating)      lines.push(`- Note de crédit : ${ctx.credit_rating}`);
    lines.push('');
  }

  if (ctx.latest_assessment_summary) {
    lines.push('## Dernière évaluation de risque');
    lines.push(ctx.latest_assessment_summary);
    lines.push('');
  }

  if (ctx.open_alerts_count > 0) {
    lines.push(`## Alertes : ${ctx.open_alerts_count} alerte(s) ouverte(s) actuellement`);
    lines.push('');
  }

  if (ctx.notes) {
    lines.push('## Notes internes');
    lines.push(ctx.notes);
    lines.push('');
  }

  lines.push('Identifie les signaux de risque actuels basés sur ces données.');
  return lines.join('\n');
}

// ─── Mock mode — réponses déterministes réalistes ─────────────────────────────

const HIGH_RISK_COUNTRIES = new Set(['RU', 'KP', 'BY', 'IR', 'SY', 'CU', 'VE']);
const MEDIUM_RISK_COUNTRIES = new Set(['CN', 'TR', 'PK', 'BD', 'MM', 'NG', 'ZW']);

export function generateMockResult(ctx: SupplierContext): AnalysisResult {
  const signals: RiskSignal[] = [];
  const recommendations: Recommendation[] = [];
  const score = ctx.global_score ?? 50;

  // Signaux basés sur les scores
  if ((ctx.financial_score ?? score) < 40) {
    signals.push({
      type: 'financial',
      severity: ctx.financial_score !== null && ctx.financial_score < 25 ? 'critical' : 'warning',
      title: `Score financier dégradé — ${ctx.name}`,
      description: `Le score financier de ${ctx.financial_score ?? 'N/A'}/100 indique des fragilités significatives. Vérifier la solvabilité, le ratio d'endettement et la stabilité du chiffre d'affaires.`,
      confidence: 85,
      source_hint: 'Bilan financier, rapport Dun & Bradstreet',
    });
    recommendations.push({
      priority: 'high',
      action: 'Demander les derniers états financiers audités (bilan + compte de résultat)',
      rationale: 'Score financier sous le seuil d\'alerte — risque de défaillance à surveiller',
    });
  }

  if ((ctx.geopolitical_score ?? score) < 40 || HIGH_RISK_COUNTRIES.has(ctx.country_code ?? '')) {
    signals.push({
      type: 'geopolitical',
      severity: HIGH_RISK_COUNTRIES.has(ctx.country_code ?? '') ? 'critical' : 'warning',
      title: `Risque géopolitique — ${ctx.country_name ?? ctx.country_code}`,
      description: HIGH_RISK_COUNTRIES.has(ctx.country_code ?? '')
        ? `Le pays d'origine (${ctx.country_name ?? ctx.country_code}) est soumis à des sanctions internationales ou présente un risque d'instabilité élevé. Vérification de conformité obligatoire.`
        : `Contexte géopolitique instable dans le pays du fournisseur. Tensions commerciales, instabilité politique ou risque de sanctions à surveiller.`,
      confidence: HIGH_RISK_COUNTRIES.has(ctx.country_code ?? '') ? 95 : 70,
      source_hint: 'Listes de sanctions OFAC, UE, ONU — OCDE country risk',
    });
    recommendations.push({
      priority: HIGH_RISK_COUNTRIES.has(ctx.country_code ?? '') ? 'high' : 'medium',
      action: 'Effectuer un screening sanctions complet et mettre à jour l\'évaluation géopolitique',
      rationale: 'Exposition aux sanctions ou instabilité géopolitique confirmée',
    });
  } else if (MEDIUM_RISK_COUNTRIES.has(ctx.country_code ?? '')) {
    signals.push({
      type: 'geopolitical',
      severity: 'info',
      title: `Surveillance géopolitique recommandée — ${ctx.country_name ?? ctx.country_code}`,
      description: `Le pays présente un niveau de risque modéré. Maintenir une veille sur l'évolution des relations commerciales et réglementaires.`,
      confidence: 65,
      source_hint: 'OCDE country risk, actualités commerciales',
    });
  }

  if ((ctx.operational_score ?? score) < 40) {
    signals.push({
      type: 'operational',
      severity: 'warning',
      title: 'Performance opérationnelle insuffisante',
      description: `Score opérationnel de ${ctx.operational_score ?? 'N/A'}/100. Risques identifiés sur la fiabilité des livraisons, les certifications qualité ou la capacité de production.`,
      confidence: 80,
      source_hint: 'Historique livraisons, certifications ISO, audit opérationnel',
    });
  }

  if (ctx.is_sole_source) {
    signals.push({
      type: 'operational',
      severity: score < 50 ? 'critical' : 'warning',
      title: 'Dépendance sole source — aucune alternative disponible',
      description: `Ce fournisseur est identifié comme seul fournisseur pour ce besoin. Toute défaillance entraînerait un arrêt de production sans substitution possible à court terme.`,
      confidence: 100,
      source_hint: 'Analyse portefeuille achats — identification alternatives marché',
    });
    recommendations.push({
      priority: score < 50 ? 'high' : 'medium',
      action: 'Lancer un appel d\'offres pour qualifier 1 à 2 fournisseurs alternatifs',
      rationale: 'Dépendance unique incompatible avec la résilience supply chain',
    });
  }

  if ((ctx.esg_score ?? score) < 40) {
    signals.push({
      type: 'esg',
      severity: 'warning',
      title: 'Non-conformité ESG potentielle',
      description: `Score ESG de ${ctx.esg_score ?? 'N/A'}/100. Des lacunes en matière de conformité environnementale, de pratiques sociales ou d'anti-corruption sont possibles.`,
      confidence: 70,
      source_hint: 'Audit ESG, rapport EcoVadis, devoir de vigilance',
    });
  }

  // Si tout va bien
  if (signals.length === 0) {
    signals.push({
      type: 'operational',
      severity: 'info',
      title: 'Profil de risque satisfaisant',
      description: `Score global de ${score}/100. Aucun signal critique identifié sur la base des données disponibles. Maintenir le suivi régulier.`,
      confidence: 80,
    });
    recommendations.push({
      priority: 'low',
      action: 'Planifier la prochaine évaluation annuelle',
      rationale: 'Maintenir la fraîcheur des données de risque',
    });
  }

  const hasHighRisk = signals.some((s) => s.severity === 'critical');
  const hasMediumRisk = signals.some((s) => s.severity === 'warning');

  const overall = hasHighRisk
    ? `Fournisseur à risque élevé nécessitant une attention immédiate. ${signals.filter((s) => s.severity === 'critical').map((s) => s.title).join(', ')}.`
    : hasMediumRisk
      ? `Fournisseur présentant des risques modérés à surveiller. ${signals.length} signal(s) identifié(s) requérant un suivi.`
      : `Profil de risque globalement satisfaisant. La situation reste sous contrôle avec un suivi régulier.`;

  return {
    overall_assessment: overall,
    confidence_score: 72, // Score de confiance du mock
    risk_signals: signals.slice(0, 5),
    recommendations: recommendations.slice(0, 4),
    prompt_tokens: null,
    completion_tokens: null,
  };
}

// ─── Appel LLM réel (Groq — OpenAI-compatible) ───────────────────────────────

export async function callGroq(
  userPrompt: string,
  apiKey: string,
): Promise<AnalysisResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // Gratuit, excellent en JSON structuré
      temperature: 0.2,                 // Basse pour des réponses reproductibles
      max_tokens: 2000,
      response_format: { type: 'json_object' }, // Force le JSON — évite le parsing fragile
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const usage = data.usage ?? {};
  const rawContent: string = data.choices?.[0]?.message?.content ?? '';

  let parsed: Omit<AnalysisResult, 'prompt_tokens' | 'completion_tokens'>;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    // Fallback : extraire le JSON si le modèle a ajouté du texte autour
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`JSON invalide dans la réponse Groq: ${rawContent.slice(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  return {
    ...parsed,
    prompt_tokens: usage.prompt_tokens ?? null,
    completion_tokens: usage.completion_tokens ?? null,
  };
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

type RuntimeWithEnv = typeof globalThis & {
  Deno?: { env?: { get: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function getRuntimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeWithEnv;
  return runtime.Deno?.env?.get(name) ?? runtime.process?.env?.[name];
}

/**
 * Point d'entrée unique pour l'analyse.
 * Consulte les variables d'environnement dans l'ordre :
 *   1. MOCK_AI=true   → mock déterministe (développement)
 *   2. GROQ_API_KEY   → Groq Llama 3.3 (gratuit, recommandé)
 */
export async function analyzeSupplier(ctx: SupplierContext): Promise<AnalysisResult> {
  const mockMode = getRuntimeEnv('MOCK_AI') === 'true';
  const groqKey  = getRuntimeEnv('GROQ_API_KEY') ?? '';

  if (mockMode) {
    // Simuler une latence réaliste (~300ms) pour que l'UI ne soit pas trop rapide
    await new Promise((r) => setTimeout(r, 300));
    return generateMockResult(ctx);
  }

  if (!groqKey) {
    throw new Error(
      'Aucune clé API configurée. Définir GROQ_API_KEY (console.groq.com) ou MOCK_AI=true pour le développement.'
    );
  }

  const prompt = buildPrompt(ctx);
  return callGroq(prompt, groqKey);
}
