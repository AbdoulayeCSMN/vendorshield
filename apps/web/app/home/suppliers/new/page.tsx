import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { withI18n } from '~/lib/i18n/with-i18n';
import { SupplierForm } from './_components/supplier-form';

export const metadata = {
  title: 'Nouveau fournisseur — VendorShield',
};

function NewSupplierPage() {
  return (
    <>
      <PageHeader
        title="Nouveau fournisseur"
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
