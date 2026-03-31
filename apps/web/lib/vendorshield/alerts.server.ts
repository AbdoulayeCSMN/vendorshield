import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  AuditAction,
} from '~/lib/vendorshield/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AlertWithSupplier extends Alert {
  supplier: {
    id: string;
    name: string;
    country_code: string | null;
    category: string;
  } | null;
}

export interface AlertsFilters {
  status?: AlertStatus;
  severity?: AlertSeverity;
  supplier_id?: string;
  sort?: 'created_at' | 'severity' | 'score_snapshot';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ─── KPIs alertes ─────────────────────────────────────────────────────────────

export interface AlertsKpis {
  open_total: number;
  critical_open: number;
  warning_open: number;
  info_open: number;
  resolved_today: number;
}

export async function getAlertsKpis(): Promise<AlertsKpis> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('alerts')
    .select('severity, status, resolved_at');

  if (!data) return { open_total: 0, critical_open: 0, warning_open: 0, info_open: 0, resolved_today: 0 };

  const today: string = new Date().toISOString().slice(0, 10);

  return {
    open_total:     data.filter((a: Alert) => a.status === 'open').length,
    critical_open:  data.filter((a: Alert) => a.status === 'open' && a.severity === 'critical').length,
    warning_open:   data.filter((a: Alert) => a.status === 'open' && a.severity === 'warning').length,
    info_open:      data.filter((a: Alert) => a.status === 'open' && a.severity === 'info').length,
    resolved_today: data.filter((a: Alert) => a.status === 'resolved' && a.resolved_at && a.resolved_at.startsWith(today)).length,
  };
}

// ─── Liste des alertes ────────────────────────────────────────────────────────

export async function getAlerts(filters: AlertsFilters = {}) {
  const client = getSupabaseServerClient();
  const {
    status,
    severity,
    supplier_id,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    limit = 30,
  } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from('alerts')
    .select(
      `*, supplier:suppliers(id, name, country_code, category)`,
      { count: 'exact' },
    );

  if (status) query = query.eq('status', status);
  else query = query.neq('status', 'dismissed'); // masquer dismissed par défaut
  if (severity) query = query.eq('severity', severity);
  if (supplier_id) query = query.eq('supplier_id', supplier_id);

  query = query.order(sort, { ascending: order === 'asc', nullsFirst: false });
  query = query.range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    alerts: (data ?? []) as AlertWithSupplier[],
    total: count ?? 0,
    page,
    limit,
    pageCount: Math.ceil((count ?? 0) / limit),
  };
}

// ─── Règles d'alerte ──────────────────────────────────────────────────────────

export async function getAlertRules(): Promise<AlertRule[]> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('alert_rules')
    .select('*')
    .order('is_active', { ascending: false })
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AlertRule[];
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  account_id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditFilters {
  action?: AuditAction;
  entity_type?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLog(filters: AuditFilters = {}) {
  const client = getSupabaseServerClient();
  const { action, entity_type, page = 1, limit = 50 } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (action) query = query.eq('action', action);
  if (entity_type) query = query.eq('entity_type', entity_type);

  query = query.range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    entries: (data ?? []) as AuditLogEntry[],
    total: count ?? 0,
    page,
    limit,
    pageCount: Math.ceil((count ?? 0) / limit),
  };
}
