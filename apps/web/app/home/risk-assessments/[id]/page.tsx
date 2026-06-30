import { notFound } from 'next/navigation';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import { getAssessmentById } from '~/lib/vendorshield/assessments.server';
import { AssessmentDetail } from './_components/assessment-detail';

interface Props {
  params: Promise<{ id: string }>;
}

async function AssessmentDetailPage({ params }: Props) {
  const { id } = await params;
  const assessment = await getAssessmentById(id);

  if (!assessment) notFound();

  return (
    <>
      <PageHeader title={assessment.title} description={<AppBreadcrumbs />} />
      <PageBody>
        <AssessmentDetail assessment={assessment} />
      </PageBody>
    </>
  );
}

export default withI18n(AssessmentDetailPage);

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const assessment = await getAssessmentById(id);
  return { title: assessment ? `${assessment.title} — Avilyre` : 'Évaluation' };
}
