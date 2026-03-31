import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type {
  AssessmentStatus,
  RiskAssessment,
  RiskDimension,
  RiskFactor,
  ScoringTemplate,
  Supplier,
} from '~/lib/vendorshield/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AssessmentsFilters {
  supplier_id?: string;
  status?: AssessmentStatus;
  sort?: 'assessment_date' | 'global_score' | 'created_at';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AssessmentWithSupplier extends RiskAssessment {
  supplier: Pick<
    Supplier,
    'id' | 'name' | 'country_code' | 'country_name' | 'category' | 'criticality'
  >;
}

export interface AssessmentWithFactors extends AssessmentWithSupplier {
  risk_factors: RiskFactor[];
  factors_by_dimension: Record<RiskDimension, RiskFactor[]>;
}

// ─── Liste des évaluations ────────────────────────────────────────────────────

export async function getAssessments(filters: AssessmentsFilters = {}) {
  const client = getSupabaseServerClient();
  const {
    supplier_id,
    status,
    sort = 'assessment_date',
    order = 'desc',
    page = 1,
    limit = 25,
  } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from('risk_assessments')
    .select(
      `*, supplier:suppliers(id, name, country_code, country_name, category, criticality)`,
      { count: 'exact' },
    )
    .neq('status', 'archived');

  if (supplier_id) query = query.eq('supplier_id', supplier_id);
  if (status) query = query.eq('status', status);

  query = query.order(sort, { ascending: order === 'asc', nullsFirst: false });
  query = query.range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    assessments: (data ?? []) as AssessmentWithSupplier[],
    total: count ?? 0,
    page,
    limit,
    pageCount: Math.ceil((count ?? 0) / limit),
  };
}

// ─── Évaluation par ID ────────────────────────────────────────────────────────

export async function getAssessmentById(
  id: string,
): Promise<AssessmentWithFactors | null> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('risk_assessments')
    .select(
      `*,
       supplier:suppliers(id, name, country_code, country_name, category, criticality),
       risk_factors(*)`,
    )
    .eq('id', id)
    .order('dimension', { referencedTable: 'risk_factors', ascending: true })
    .order('weight', {
      referencedTable: 'risk_factors',
      ascending: false,
    })
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  // Grouper les facteurs par dimension
  const factors: RiskFactor[] = data.risk_factors ?? [];
  const factors_by_dimension = factors.reduce<Record<RiskDimension, RiskFactor[]>>(
    (acc, f) => {
      if (!acc[f.dimension]) acc[f.dimension] = [];
      acc[f.dimension].push(f);
      return acc;
    },
    {} as Record<RiskDimension, RiskFactor[]>,
  );

  return { ...data, factors_by_dimension } as AssessmentWithFactors;
}

// ─── Templates de scoring ─────────────────────────────────────────────────────

export async function getScoringTemplates(): Promise<ScoringTemplate[]> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('scoring_templates')
    .select('*')
    .or('is_system.eq.true,org_id.is.null')
    .order('is_system', { ascending: false })
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as ScoringTemplate[];
}

// ─── Fournisseurs actifs (pour le select du wizard) ───────────────────────────

export async function getActiveSuppliers() {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('suppliers')
    .select('id, name, country_code, category, global_score, risk_level')
    .eq('status', 'active')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<
    Supplier,
    'id' | 'name' | 'country_code' | 'category' | 'global_score' | 'risk_level'
  >[];
}
