// Types & constantes pour Audits et Plans d'action (CAPA).

export const AUDIT_TYPES = [
  { value: 'quality', label: 'Qualité' },
  { value: 'social', label: 'Social / RSE' },
  { value: 'security', label: 'Sécurité' },
  { value: 'financial', label: 'Financier' },
  { value: 'onsite', label: 'Sur site' },
] as const;

export const AUDIT_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export const AUDIT_RESULTS = ['pass', 'conditional', 'fail'] as const;

export const CAPA_PRIORITIES = ['low', 'medium', 'high'] as const;
export const CAPA_STATUSES = ['open', 'in_progress', 'done', 'cancelled'] as const;

export interface SupplierAudit {
  id: string;
  audit_type: string;
  title: string;
  auditor: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  result: string | null;
  findings: string | null;
}

export interface CorrectiveAction {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  priority: string;
  status: string;
  owner: string | null;
  due_date: string | null;
}
