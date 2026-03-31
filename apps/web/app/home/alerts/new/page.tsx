import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import { getActiveSuppliers } from '~/lib/vendorshield/assessments.server';
import { ManualAlertForm } from './_components/manual-alert-form';

async function NewAlertPage() {
  const suppliers = await getActiveSuppliers();

  return (
    <>
      <PageHeader title="Nouvelle alerte manuelle" description={<AppBreadcrumbs />} />
      <PageBody>
        <div className="max-w-lg">
          <ManualAlertForm suppliers={suppliers} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(NewAlertPage);
