import { PageBody, PageHeader } from '@kit/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import type { AuditAction } from '~/lib/vendorshield/types';
import {
  getAuditLog,
  type AuditFilters,
} from '~/lib/vendorshield/alerts.server';

import { AuditLogTable } from './_components/audit-log-table';

interface Props {
  searchParams: Promise<{
    action?: string;
    entity_type?: string;
    page?: string;
  }>;
}

async function AuditLogPage({ searchParams }: Props) {
  const { t } = await createI18nServerInstance();
  const params = await searchParams;

  const filters: AuditFilters = {
    action: params.action as AuditAction | undefined,
    entity_type: params.entity_type,
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 50,
  };

  const { entries, total, page, pageCount } = await getAuditLog(filters);

  return (
    <>
      <PageHeader
        title={t('vendorshield:pages.auditLog')}
        description={t('vendorshield:pages.auditLogDesc', { count: total })}
      />
      <PageBody>
        <AuditLogTable
          entries={entries}
          total={total}
          page={page}
          pageCount={pageCount}
          filters={filters}
        />
      </PageBody>
    </>
  );
}

export default withI18n(AuditLogPage);
