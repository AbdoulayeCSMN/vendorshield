import { PageBody, PageHeader } from '@kit/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
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
import { getBankruptcyOverview } from '~/lib/vendorshield/actions/prediction.actions';

import { AnalyticsDashboard } from './_components/analytics-dashboard';

async function AnalyticsPage() {
  const { t } = await createI18nServerInstance();
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
    bankruptcyOverview,
  ] = await Promise.all([
    getAnalyticsDashboard(),
    getRiskDistribution(),
    getDimensionScores(),
    getScoresByCategory(),
    getAssessmentTrend(),
    getTopRiskySuppliers(10),
    getSoleSourceExposure(),
    getCountryExposure(),
    getBankruptcyOverview(),
  ]);

  return (
    <>
      <PageHeader
        title={t('vendorshield:pages.analytics')}
        description={t('vendorshield:pages.analyticsDesc')}
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
          bankruptcyOverview={bankruptcyOverview}
        />
      </PageBody>
    </>
  );
}

export default withI18n(AnalyticsPage);
