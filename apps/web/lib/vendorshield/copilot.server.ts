import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAlerts } from '~/lib/vendorshield/alerts.server';
import {
  getAnalyticsDashboard,
  getTopRiskySuppliers,
} from '~/lib/vendorshield/analytics.server';
import { getOrganizationExposure } from '~/lib/vendorshield/exposure.server';

/**
 * Carte des capacités / navigation — permet au copilote de guider l'utilisateur
 * vers la bonne page plutôt que d'inventer.
 */
const CAPABILITIES = `
APP PAGES (suggest markdown links when useful):
- [Dashboard](/home) — risk overview, trends, world map
- [Suppliers](/home/suppliers) — list, scores, detail sheets · [Add](/home/suppliers/new)
- [Imports](/home/imports) — import Excel/CSV/JSON files for **suppliers OR deliveries**; column mapping is **AI-assisted** (accepts any headers)
- [Risk Assessments](/home/risk-assessments) — 24-criteria rating (feeds scores)
- [Alerts](/home/alerts) — monitoring, "Scan now" button · [Alert Rules](/home/alerts/rules) · [Manual Alert](/home/alerts/new)
- [Analytics](/home/analytics) — trends, comparisons, exposure
- [Risk Map](/home/risk-map) — probability × impact matrix
- [Exposure](/home/exposure) — Spend-at-Risk, HHI concentration, stress-test, **Multi-sourcing & diversification** (AI strategic advice)
- [Supply Chain](/home/supply-chain) — multi-tier graph
- [Audit Log](/home/audit-log) — action traceability
- [Copilot](/home/copilot) — dedicated assistant (this conversation)
- [Onboarding](/onboarding) — guided setup · [Settings](/home/settings) · [Organization](/home/organization) · [Billing](/home/billing)
- Supplier portal (secure external link /portal/...) — supplier fills questionnaires without an account

SUPPLIER SHEET MODULES (tabs at /home/suppliers/[id]):
- Overview & 5-dimension scores (global, financial, operational, geopolitical, ESG)
- 24-criteria assessments · Supplier alerts · Contacts
- **Operational predictions** (delivery delay & PPM defects) — global cold-start for new accounts
- **Financial failure prediction** (bankruptcy)
- **Climate risk** (Open-Meteo) · **Cyber posture**
- **Documents & compliance** (certifications, expiry dates, CSRD)
- **Questionnaires** (sent via portal) · **Audits** & **corrective action plans (CAPA)**
- **KPI scorecard** + **PDF** export · Tier network graph

AI & AUTOMATION CAPABILITIES:
- 5-dimension risk scores; delay/PPM prediction; bankruptcy prediction
- **Any-format import**: AI column mapping + data cleaning
- **Automatic monitoring**: detects expiring documents/contracts and stale assessments → creates alerts + email
- **Multi-sourcing advice**: identifies sole-source/critical dependencies and suggests alternatives
- **Automatic ML retraining** + global fallback (new customers get predictions from day 1)
- Copilot (you), PDF scorecard, automatic email alerts
`.trim();

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n);
}

/**
 * Bloc de contexte ciblé sur un fournisseur (quand l'utilisateur consulte sa
 * fiche) — scores, alertes ouvertes et dernière prédiction opérationnelle.
 */
export async function buildSupplierContextBlock(supplierId: string): Promise<string | null> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: s } = await (client as any)
    .from('supplier_risk_summary')
    .select(
      'name,country_code,category,global_score,financial_score,operational_score,geopolitical_score,esg_score,risk_level,criticality,annual_spend_eur',
    )
    .eq('id', supplierId)
    .maybeSingle();
  if (!s) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: alerts }, { data: pred }] = await Promise.all([
    (client as any)
      .from('alerts')
      .select('severity,title')
      .eq('supplier_id', supplierId)
      .eq('status', 'open')
      .limit(5),
    (client as any)
      .from('delivery_predictions')
      .select(
        'delay_probability,expected_delay_days,predicted_ppm,ppm_breach_probability,risk_level,explanation',
      )
      .eq('supplier_id', supplierId)
      .maybeSingle(),
  ]);

  const alertsTxt = (alerts ?? []).length
    ? (alerts as { severity: string; title: string }[])
        .map((a) => `[${a.severity}] ${a.title}`)
        .join('; ')
    : 'none';

  const predTxt = pred
    ? `delay ${fmt(pred.delay_probability)}% (≈${fmt(pred.expected_delay_days)} d), predicted PPM ${fmt(
        pred.predicted_ppm,
      )} (breach ${fmt(pred.ppm_breach_probability)}%), level ${pred.risk_level ?? '—'}`
    : 'not computed';

  return `CURRENTLY VIEWED SUPPLIER — ${s.name}:
- Country: ${s.country_code ?? '—'} · Category: ${s.category ?? '—'} · Criticality: ${s.criticality ?? '—'}
- Scores: global ${fmt(s.global_score)}, financial ${fmt(s.financial_score)}, operational ${fmt(
    s.operational_score,
  )}, geopolitical ${fmt(s.geopolitical_score)}, ESG ${fmt(s.esg_score)} (level ${s.risk_level ?? '—'})
- Annual spend: ${fmt(s.annual_spend_eur)}
- Open alerts: ${alertsTxt}
- Operational prediction: ${predTxt}
When the user says "this supplier", they mean this one.`;
}

/**
 * Construit le prompt système complet, incluant un instantané (account-scoped
 * via RLS) de l'état réel du compte. Tronqué pour rester économe en tokens.
 * Si `supplierId` est fourni, ajoute un bloc ciblé sur ce fournisseur.
 */
export async function buildCopilotSystemPrompt(supplierId?: string): Promise<string> {
  const [kpis, topRisky, alerts, exposure] = await Promise.all([
    getAnalyticsDashboard(),
    getTopRiskySuppliers(5),
    getAlerts({ status: 'open', sort: 'created_at', order: 'desc', limit: 5 }),
    getOrganizationExposure().catch(() => null),
  ]);

  const exposureLine = exposure
    ? `Spend-at-Risk: ${fmt(exposure.spend_at_risk)} € (${fmt(exposure.sar_pct)}% of spend) · HHI Concentration: ${fmt(
        exposure.hhi,
      )} (${exposure.concentration_level}) · Top-3 dependency: ${fmt(exposure.top3_share)}% · Sole sources: ${fmt(
        exposure.sole_source_count,
      )}`
    : 'Exposure data unavailable.';

  const kpiLine = kpis
    ? `Suppliers: ${fmt(kpis.total_suppliers)} · High/critical risk: ${fmt(
        kpis.high_risk_count + kpis.critical_risk_count,
      )} · Avg score: ${fmt(kpis.avg_global_score)} · Open alerts: ${fmt(
        kpis.open_alerts_total,
      )}`
    : 'No aggregated data available (account likely empty).';

  const suppliersBlock = topRisky.length
    ? topRisky
        .map(
          (s) =>
            `- ${s.name} — score ${fmt(s.global_score)} (${s.risk_level ?? '—'})${
              s.country_code ? `, ${s.country_code}` : ''
            }`,
        )
        .join('\n')
    : 'No risky suppliers recorded.';

  const alertsBlock = alerts.alerts.length
    ? alerts.alerts
        .map((a) => `- [${a.severity}] ${a.title}`)
        .join('\n')
    : 'No open alerts.';

  const supplierBlock = supplierId ? await buildSupplierContextBlock(supplierId) : null;

  return `You are Avilyre's copilot named Aboki, an assistant for procurement and supply chain directors.
You help understand supplier risks and use the application. Avilyre is a SaaS for managing and anticipating supplier risks.

STYLE RULES:
- Detect the user's language from their message and respond in the same language (French if they write in French, English if they write in English).
- Structure your responses: short headings, bullet points, and especially **markdown tables** whenever you list or compare items (suppliers, scores, alerts, deadlines…).
- Briefly explain the "why" when it's useful for decision-making, without overwhelming the user.
- **Bold** numbers and key points.
- Use ONLY the data below; NEVER invent figures or suppliers.
- If information is missing, say so and suggest the page where it can be found (markdown link).
- When relevant, end with a concrete action suggestion and a link to the right page.

${CAPABILITIES}

CURRENT ACCOUNT STATE:
${kpiLine}
Portfolio exposure: ${exposureLine}

Top risky suppliers:
${suppliersBlock}

Recent open alerts:
${alertsBlock}${supplierBlock ? `\n\n${supplierBlock}` : ''}`;
}
