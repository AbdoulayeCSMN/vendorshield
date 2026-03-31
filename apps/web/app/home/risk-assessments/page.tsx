import Link from 'next/link';

import { PlusIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import type { AssessmentStatus } from '~/lib/vendorshield/types';
import {
  getAssessments,
  type AssessmentsFilters,
} from '~/lib/vendorshield/assessments.server';

import { AssessmentsTable } from './_components/assessments-table';

interface Props {
  searchParams: Promise<{
    status?: string;
    supplier_id?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

async function RiskAssessmentsPage({ searchParams }: Props) {
  const params = await searchParams;

  const filters: AssessmentsFilters = {
    supplier_id: params.supplier_id,
    status: params.status as AssessmentStatus | undefined,
    sort: (params.sort as AssessmentsFilters['sort']) ?? 'assessment_date',
    order: (params.order as 'asc' | 'desc') ?? 'desc',
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 25,
  };

  const { assessments, total, page, pageCount } = await getAssessments(filters);

  return (
    <>
      <PageHeader
        title="Évaluations de risque"
        description={`${total} évaluation${total > 1 ? 's' : ''}`}
      >
        <Button asChild size="sm">
          <Link href="/home/risk-assessments/new">
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Nouvelle évaluation
          </Link>
        </Button>
      </PageHeader>

      <PageBody>
        <AssessmentsTable
          assessments={assessments}
          total={total}
          page={page}
          pageCount={pageCount}
          filters={filters}
        />
      </PageBody>
    </>
  );
}

export default withI18n(RiskAssessmentsPage);
