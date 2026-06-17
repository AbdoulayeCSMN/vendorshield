import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type {
  RiskLevel,
  Supplier,
  SupplierCategory,
  SupplierCriticality,
  SupplierRiskSummary,
  SupplierStatus,
} from '~/lib/vendorshield/types';

// ─── Filtres ──────────────────────────────────────────────────────────────────

export interface SuppliersFilters {
  q?: string;
  status?: SupplierStatus;
  risk_level?: RiskLevel;
  category?: SupplierCategory;
  criticality?: SupplierCriticality;
  sort?: 'global_score' | 'name' | 'updated_at' | 'annual_spend_eur';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ─── Liste des fournisseurs ───────────────────────────────────────────────────

export async function getSuppliers(filters: SuppliersFilters = {}) {
  const client = getSupabaseServerClient();
  const {
    q, status, risk_level, category, criticality,
    sort = 'global_score', order = 'asc', page = 1, limit = 25,
  } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from('supplier_risk_summary')
    .select('*', { count: 'exact' });

  if (q?.trim()) query = query.ilike('name', `%${q.trim()}%`);
  if (status)      query = query.eq('status', status);
  if (risk_level)  query = query.eq('risk_level', risk_level);
  if (category)    query = query.eq('category', category);
  if (criticality) query = query.eq('criticality', criticality);
  if (!status)     query = query.neq('status', 'blacklisted');

  query = query
    .order(sort, { ascending: order === 'asc', nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;
  
  if (error) {
    console.error('[getSuppliers] Supabase error:', {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
    });
    // Return empty result on error instead of throwing to allow page to render
    return {
      suppliers: [],
      total: 0,
      page,
      limit,
      pageCount: 0,
    };
  }

  return {
    suppliers: (data ?? []) as SupplierRiskSummary[],
    total:     count ?? 0,
    page,
    limit,
    pageCount: Math.ceil((count ?? 0) / limit),
  };
}

// ─── Types relations ──────────────────────────────────────────────────────────

export interface SupplierContact {
  id: string; first_name: string; last_name: string;
  job_title: string | null; email: string | null;
  phone: string | null; is_primary: boolean; department: string | null;
}

export interface SupplierAssessment {
  id: string; title: string; assessment_date: string; status: string;
  global_score: number | null; financial_score: number | null;
  operational_score: number | null; geopolitical_score: number | null;
  esg_score: number | null; created_at: string;
}

export interface SupplierAlert {
  id: string; type: string; severity: string; status: string;
  title: string; message: string;
  score_snapshot: number | null; score_delta: number | null;
  created_at: string;
}

export interface SupplierWithRelations extends Supplier {
  supplier_contacts:  SupplierContact[];
  risk_assessments:   SupplierAssessment[];
  alerts:             SupplierAlert[];
  open_alerts:        number;
  completed_assessments: number;
  last_assessment_date: string | null;
}

// ─── Fournisseur par ID — 3 requêtes séparées (évite referencedTable ordering) ─

export async function getSupplierById(
  id: string,
): Promise<SupplierWithRelations | null> {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;

  // 1. Données principales du fournisseur
  const { data: supplier, error } = await c
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle(); // maybeSingle() retourne null si absent (pas d'erreur PGRST116)

  if (error) {
    console.error('[getSupplierById] supplier error:', error.code, error.message);
    return null;
  }
  if (!supplier) return null;

  // 2. Relations en parallèle — chacune avec sa propre gestion d'erreur
  const [contactsRes, assessmentsRes, alertsRes] = await Promise.all([
    c.from('supplier_contacts')
      .select('id,first_name,last_name,job_title,email,phone,is_primary,department')
      .eq('supplier_id', id)
      .order('is_primary', { ascending: false }),

    c.from('risk_assessments')
      .select('id,title,assessment_date,status,global_score,financial_score,operational_score,geopolitical_score,esg_score,created_at')
      .eq('supplier_id', id)
      .order('assessment_date', { ascending: false })
      .limit(20),

    c.from('alerts')
      .select('id,type,severity,status,title,message,score_snapshot,score_delta,created_at')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const contacts    = (contactsRes.data    ?? []) as SupplierContact[];
  const assessments = (assessmentsRes.data ?? []) as SupplierAssessment[];
  const alerts      = (alertsRes.data      ?? []) as SupplierAlert[];

  return {
    ...supplier,
    supplier_contacts:     contacts,
    risk_assessments:      assessments,
    alerts,
    open_alerts:           alerts.filter(a => a.status === 'open').length,
    completed_assessments: assessments.filter(a => ['completed','approved'].includes(a.status)).length,
    last_assessment_date:  assessments[0]?.assessment_date ?? null,
  } as SupplierWithRelations;
}

// ─── KPIs rapides ─────────────────────────────────────────────────────────────

export async function getSupplierAlertCount(supplierId: string) {
  const client = getSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplierId)
    .eq('status', 'open');
  return count ?? 0;
}
