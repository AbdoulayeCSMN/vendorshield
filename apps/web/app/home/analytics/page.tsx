import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import {
  getAnalyticsDashboard,
  getAssessmentTrend,
  getCountryExposure,
  getDimensionScores,
  getRiskDistribution,
  getScoresByCategory,
  getSoleSourceExposure,
  getTopRiskySuppliers,
} from '~/lib/vendorshield/analytics.server';

import { AnalyticsDashboard } from './_components/analytics-dashboard';

async function AnalyticsPage() {
  // Tout en parallèle — une seule passe réseau
  const [
    kpis,
    riskDist,
    dimScores,
    catScores,
    trend,
    topRisky,
    soleSource,
    countries,
  ] = await Promise.all([
    getAnalyticsDashboard(),
    getRiskDistribution(),
    getDimensionScores(),
    getScoresByCategory(),
    getAssessmentTrend(),
    getTopRiskySuppliers(10),
    getSoleSourceExposure(),
    getCountryExposure(),
  ]);

  return (
    <>
      <PageHeader
        title="Risk Analytics"
        description="Vue agrégée de l'exposition risque de votre portefeuille fournisseurs"
      />
      <PageBody>
        <AnalyticsDashboard
          kpis={kpis}
          riskDistribution={riskDist}
          dimensionScores={dimScores}
          categoryScores={catScores}
          assessmentTrend={trend}
          topRiskySuppliers={topRisky}
          soleSourceSuppliers={soleSource}
          countryExposure={countries}
        />
      </PageBody>
    </>
  );
}

export default withI18n(AnalyticsPage);
