import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import {
  getAnalyticsDashboard,
  getDimensionScores,
  getRiskDistribution,
  getTopRiskySuppliers,
  getCountryExposure,
  getSuppliersForNetwork,
} from '~/lib/vendorshield/analytics.server';
import { getAlerts } from '~/lib/vendorshield/alerts.server';

import { VendorShieldDashboard } from './_components/vendorshield-dashboard';

async function HomePage() {
  const [kpis, riskDist, dimScores, topRisky, recentAlerts, countries, networkSuppliers] =
    await Promise.all([
      getAnalyticsDashboard(),
      getRiskDistribution(),
      getDimensionScores(),
      getTopRiskySuppliers(8),
      getAlerts({ status: 'open', sort: 'created_at', order: 'desc', limit: 6 }),
      getCountryExposure(),
      getSuppliersForNetwork(),
    ]);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos risques fournisseurs"
      />
      <PageBody>
        <VendorShieldDashboard
          kpis={kpis}
          riskDistribution={riskDist}
          dimensionScores={dimScores}
          topSuppliers={topRisky}
          recentAlerts={recentAlerts.alerts}
          countryExposure={countries}
          networkSuppliers={networkSuppliers}
        />
      </PageBody>
    </>
  );
}

export default withI18n(HomePage);
