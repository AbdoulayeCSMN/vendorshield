import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { SupplierForm } from './_components/supplier-form';

export const metadata = {
  title: 'Nouveau fournisseur — Avilyre',
};

async function NewSupplierPage() {
  const { t } = await createI18nServerInstance();
  return (
    <>
      <PageHeader
        title={t('vendorshield:pages.suppliersNew')}
        description={<AppBreadcrumbs />}
      />
      <PageBody>
        <div className="max-w-2xl">
          <SupplierForm />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(NewSupplierPage);
