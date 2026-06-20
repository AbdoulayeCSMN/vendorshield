import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { withI18n } from '~/lib/i18n/with-i18n';

import { CopilotChat } from './_components/copilot-chat';

function CopilotPage() {
  return (
    <>
      <PageHeader title="Copilote" description={<AppBreadcrumbs />} />
      <PageBody>
        <CopilotChat />
      </PageBody>
    </>
  );
}

export default withI18n(CopilotPage);
