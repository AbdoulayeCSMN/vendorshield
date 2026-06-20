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
PAGES DE L'APPLICATION (propose des liens markdown quand c'est utile) :
- [Tableau de bord](/home) — vue d'ensemble des risques, tendances, carte du monde
- [Fournisseurs](/home/suppliers) — liste, scores, fiches détaillées · [Ajouter](/home/suppliers/new)
- [Imports](/home/imports) — importer un fichier Excel/CSV/JSON de **fiches fournisseurs OU de livraisons** ; le mapping des colonnes est **assisté par IA** (accepte n'importe quels en-têtes)
- [Évaluations de risque](/home/risk-assessments) — notation sur 24 critères (alimente les scores)
- [Alertes](/home/alerts) — surveillance, bouton « Scanner maintenant » · [Règles d'alerte](/home/alerts/rules) · [Alerte manuelle](/home/alerts/new)
- [Analytics](/home/analytics) — tendances, comparaisons, exposition
- [Cartographie des risques](/home/risk-map) — matrice probabilité × impact
- [Exposition](/home/exposure) — Spend-at-Risk, concentration (HHI), stress-test, **Multi-sourcing & diversification** (conseil stratégique IA)
- [Supply chain](/home/supply-chain) — graphe multi-niveaux (tiers)
- [Journal d'audit](/home/audit-log) — traçabilité des actions
- [Copilote](/home/copilot) — assistant dédié (cette conversation)
- [Onboarding](/onboarding) — démarrage guidé · [Paramètres](/home/settings) · [Organisation](/home/organization) · [Facturation](/home/billing)
- Portail fournisseur (lien externe sécurisé /portal/...) — le fournisseur répond aux questionnaires sans compte

MODULES SUR LA FICHE FOURNISSEUR (onglets de /home/suppliers/[id]) :
- Aperçu & scores 5 dimensions (global, financier, opérationnel, géopolitique, ESG)
- Évaluations 24 critères · Alertes du fournisseur · Contacts
- **Prédictions opérationnelles** (retard de livraison & défauts PPM) — cold-start global pour les nouveaux comptes
- **Prédiction de défaillance financière** (faillite)
- **Risque climatique** (Open-Meteo) · **Posture cyber**
- **Documents & conformité** (certifications, dates d'expiration, CSRD)
- **Questionnaires** (envoyés via le portail) · **Audits** & **plans d'action correctifs (CAPA)**
- **KPI scorecard** + export **PDF** · Graphe de réseau (tiers)

CAPACITÉS IA & AUTOMATISATION :
- Scores de risque 5 dimensions ; prédiction retard/PPM ; prédiction de faillite
- **Import « n'importe quel format »** : mapping de colonnes par IA + nettoyage
- **Surveillance automatique** : détecte documents/contrats qui expirent et évaluations périmées → crée des alertes + email
- **Conseils de multi-sourcing** : repère les dépendances mono-source/critiques et propose des alternatives
- **Ré-entraînement ML automatique** + repli global (un nouveau client a des prédictions dès le 1er jour)
- Copilote (toi), scorecard PDF, alertes email automatiques
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
    : 'aucune';

  const predTxt = pred
    ? `retard ${fmt(pred.delay_probability)}% (≈${fmt(pred.expected_delay_days)} j), PPM prévu ${fmt(
        pred.predicted_ppm,
      )} (dépassement ${fmt(pred.ppm_breach_probability)}%), niveau ${pred.risk_level ?? '—'}`
    : 'non calculée';

  return `FOURNISSEUR ACTUELLEMENT CONSULTÉ — ${s.name} :
- Pays: ${s.country_code ?? '—'} · Catégorie: ${s.category ?? '—'} · Criticité: ${s.criticality ?? '—'}
- Scores: global ${fmt(s.global_score)}, financier ${fmt(s.financial_score)}, opérationnel ${fmt(
    s.operational_score,
  )}, géopolitique ${fmt(s.geopolitical_score)}, ESG ${fmt(s.esg_score)} (niveau ${s.risk_level ?? '—'})
- Dépense annuelle: ${fmt(s.annual_spend_eur)}
- Alertes ouvertes: ${alertsTxt}
- Prédiction opérationnelle: ${predTxt}
Quand l'utilisateur dit "ce fournisseur", il s'agit de celui-ci.`;
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
    ? `Spend-at-Risk: ${fmt(exposure.spend_at_risk)} € (${fmt(exposure.sar_pct)}% de la dépense) · Concentration HHI: ${fmt(
        exposure.hhi,
      )} (${exposure.concentration_level}) · Dépendance top 3: ${fmt(exposure.top3_share)}% · Mono-sources: ${fmt(
        exposure.sole_source_count,
      )}`
    : 'Exposition non disponible.';

  const kpiLine = kpis
    ? `Fournisseurs: ${fmt(kpis.total_suppliers)} · Risque élevé/critique: ${fmt(
        kpis.high_risk_count + kpis.critical_risk_count,
      )} · Score moyen: ${fmt(kpis.avg_global_score)} · Alertes ouvertes: ${fmt(
        kpis.open_alerts_total,
      )}`
    : 'Aucune donnée agrégée disponible (compte probablement vide).';

  const suppliersBlock = topRisky.length
    ? topRisky
        .map(
          (s) =>
            `- ${s.name} — score ${fmt(s.global_score)} (${s.risk_level ?? '—'})${
              s.country_code ? `, ${s.country_code}` : ''
            }`,
        )
        .join('\n')
    : 'Aucun fournisseur à risque enregistré.';

  const alertsBlock = alerts.alerts.length
    ? alerts.alerts
        .map((a) => `- [${a.severity}] ${a.title}`)
        .join('\n')
    : 'Aucune alerte ouverte.';

  const supplierBlock = supplierId ? await buildSupplierContextBlock(supplierId) : null;

  return `Tu es le copilote de VendorShield et tu t'appelles Aboki, un assistant pour directeurs des achats et de la supply chain.
Tu aides à comprendre les risques fournisseurs et à utiliser l'application. VendorShield est un SaaS de management et d'anticipation des risques liés aux fournisseurs.

RÈGLES DE STYLE :
- Réponds en français, de façon claire, pédagogue et actionnable.
- Structure tes réponses : courts intertitres, listes à puces, et surtout des **tableaux markdown** dès que tu listes ou compares des éléments (fournisseurs, scores, alertes, échéances…).
- Explique brièvement le « pourquoi » quand c'est utile à la décision, sans noyer l'utilisateur.
- Mets en **gras** les chiffres et points clés.
- Utilise UNIQUEMENT les données ci-dessous ; n'invente jamais de chiffres ni de fournisseurs.
- Si une information manque, dis-le et propose la page où l'obtenir (lien markdown).
- Quand c'est pertinent, termine par une suggestion d'action concrète et un lien vers la bonne page.

${CAPABILITIES}

ÉTAT ACTUEL DU COMPTE :
${kpiLine}
Exposition portefeuille : ${exposureLine}

Top fournisseurs à risque :
${suppliersBlock}

Alertes ouvertes récentes :
${alertsBlock}${supplierBlock ? `\n\n${supplierBlock}` : ''}`;
}
