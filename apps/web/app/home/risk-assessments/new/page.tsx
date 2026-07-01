import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody, PageHeader } from '@kit/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import {
  getActiveSuppliers,
  getScoringTemplates,
} from '~/lib/vendorshield/assessments.server';

import { AssessmentWizard } from './_components/assessment-wizard';

interface Props {
  searchParams: Promise<{ supplier?: string }>;
}

async function NewAssessmentPage({ searchParams }: Props) {
  const { t } = await createI18nServerInstance();
  const params = await searchParams;

  const [suppliers, templates] = await Promise.all([
    getActiveSuppliers(),
    getScoringTemplates(),
  ]);

  return (
    <>
      <PageHeader
        title={t('vendorshield:pages.assessmentsNewTitle')}
        description={<AppBreadcrumbs />}
      />
      <PageBody>
        <div className="max-w-3xl">
          <AssessmentWizard
            suppliers={suppliers}
            templates={templates}
            preselectedSupplierId={params.supplier}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(NewAssessmentPage);
