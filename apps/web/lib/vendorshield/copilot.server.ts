import 'server-only';

import { getAlerts } from '~/lib/vendorshield/alerts.server';
import {
  getAnalyticsDashboard,
  getTopRiskySuppliers,
} from '~/lib/vendorshield/analytics.server';

/**
 * Carte des capacités / navigation — permet au copilote de guider l'utilisateur
 * vers la bonne page plutôt que d'inventer.
 */
const CAPABILITIES = `
PAGES DE L'APPLICATION (propose des liens markdown quand c'est utile) :
- [Tableau de bord](/home) — vue d'ensemble des risques
- [Fournisseurs](/home/suppliers) — liste, scores, fiches détaillées
- [Ajouter un fournisseur](/home/suppliers/new)
- [Imports](/home/imports) — importer un fichier Excel/CSV de fournisseurs ou de livraisons
- [Évaluations de risque](/home/risk-assessments) — notation sur 24 critères
- [Alertes](/home/alerts) et [Règles d'alerte](/home/alerts/rules)
- [Analytics](/home/analytics) — tendances et exposition
- [Supply chain](/home/supply-chain) — graphe multi-niveaux
- [Facturation](/home/billing)

CAPACITÉS IA :
- Score de risque global par fournisseur (financier, opérationnel, géopolitique, ESG)
- Prédiction de retard de livraison et de défauts (PPM) — panneau "Prédictions opérationnelles" sur la fiche fournisseur
- Prédiction de défaillance financière
- Scorecard PDF par fournisseur, alertes email automatiques
`.trim();

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n);
}

/**
 * Construit le prompt système complet, incluant un instantané (account-scoped
 * via RLS) de l'état réel du compte. Tronqué pour rester économe en tokens.
 */
export async function buildCopilotSystemPrompt(): Promise<string> {
  const [kpis, topRisky, alerts] = await Promise.all([
    getAnalyticsDashboard(),
    getTopRiskySuppliers(5),
    getAlerts({ status: 'open', sort: 'created_at', order: 'desc', limit: 5 }),
  ]);

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

  return `Tu es le copilote VendorShield, un assistant pour directeurs des achats et de la supply chain.
Tu aides à comprendre les risques fournisseurs et à utiliser l'application.

RÈGLES :
- Réponds en français, de façon concise, professionnelle et actionnable.
- Utilise UNIQUEMENT les données ci-dessous ; n'invente jamais de chiffres ou de fournisseurs.
- Si une information manque, dis-le et propose la page où l'obtenir.
- Quand c'est pertinent, oriente vers la bonne page avec un lien markdown.
- Formate avec des listes courtes quand utile.

${CAPABILITIES}

ÉTAT ACTUEL DU COMPTE :
${kpiLine}

Top fournisseurs à risque :
${suppliersBlock}

Alertes ouvertes récentes :
${alertsBlock}`;
}
