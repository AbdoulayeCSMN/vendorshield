import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';

import { withI18n } from '~/lib/i18n/with-i18n';
import {
  getOrganization,
  getOrgMembers,
  getPendingInvitations,
} from '~/lib/vendorshield/actions/organization.actions';
import { OrganizationManager } from './_components/organization-manager';

interface Props {
  params: Promise<{ id: string }>;
}

async function OrganizationPage({ params }: Props) {
  const { id } = await params;

  const [org, members, invitations] = await Promise.all([
    getOrganization(id),
    getOrgMembers(id),
    getPendingInvitations(id),
  ]);

  if (!org) notFound();

  return (
    <>
      <PageHeader title={org.name} description={<AppBreadcrumbs />} />
      <PageBody>
        <OrganizationManager
          org={org}
          members={members}
          pendingInvitations={invitations}
        />
      </PageBody>
    </>
  );
}

export default withI18n(OrganizationPage);
