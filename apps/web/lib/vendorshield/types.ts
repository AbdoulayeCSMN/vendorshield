/**
 * VendorShield — Types TypeScript complets
 * Correspondent exactement au schéma Supabase (migrations 1 & 2)
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SupplierCategory =
  | 'raw_materials' | 'components' | 'logistics' | 'services'
  | 'technology'    | 'energy'     | 'chemicals' | 'packaging'
  | 'maintenance'   | 'other';

export type SupplierStatus =
  | 'active' | 'under_review' | 'suspended' | 'inactive' | 'blacklisted';

export type SupplierCriticality = 'critical' | 'high' | 'medium' | 'low';
export type RiskLevel           = 'low' | 'medium' | 'high' | 'critical';
export type RiskDimension       = 'financial' | 'operational' | 'geopolitical' | 'esg';

export type AssessmentStatus =
  | 'draft' | 'in_progress' | 'completed' | 'approved' | 'archived';

export type AlertType     = 'score_drop' | 'threshold_breach' | 'new_assessment' | 'document_expiry' | 'manual' | 'system';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus   = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
export type AuditAction   = 'create' | 'update' | 'delete' | 'view' | 'export' | 'approve' | 'archive';

// Multi-tenant
export type OrgMemberRole  = 'owner' | 'admin' | 'analyst' | 'viewer' | 'auditor';
export type InviteStatus   = 'pending' | 'accepted' | 'expired' | 'revoked';
export type SsoProviderType = 'saml' | 'oidc' | 'google_workspace' | 'microsoft_entra' | 'okta';
export type OrgPlan        = 'starter' | 'pro' | 'enterprise' | 'trial';
export type CompanySize    = '1-10' | '11-50' | '51-200' | '201-1000' | '1001-5000' | '5000+';

// ─── Multi-tenant ─────────────────────────────────────────────────────────────

export interface Organization {
  id:                     string;
  name:                   string;
  slug:                   string;
  logo_url:               string | null;
  website:                string | null;
  description:            string | null;
  industry:               string | null;
  company_size:           CompanySize | null;
  country_code:           string | null;
  settings:               OrgSettings;
  plan:                   OrgPlan;
  plan_expires_at:        string | null;
  stripe_customer_id:     string | null;
  stripe_subscription_id: string | null;
  max_suppliers:          number;
  max_members:            number;
  features_json:          OrgFeatures;
  created_at:             string;
  updated_at:             string;
  created_by:             string | null;
}

export interface OrgSettings {
  default_assessment_language?:       'fr' | 'en';
  default_weight_profile_id?:         string;
  require_approval_for_assessments?:  boolean;
  auto_alert_on_score_drop?:          boolean;
  score_drop_threshold?:              number;
}

export interface OrgFeatures {
  ai_scoring?:          boolean;
  ml_predictions?:      boolean;
  api_access?:          boolean;
  custom_templates?:    boolean;
  sso?:                 boolean;
  webhooks?:            boolean;
  advanced_reports?:    boolean;
  data_enrichment?:     boolean;
}

export interface OrgMember {
  id:                       string;
  org_id:                   string;
  user_id:                  string;
  role:                     OrgMemberRole;
  status:                   'active' | 'suspended' | 'left';
  can_export:               boolean;
  can_approve_assessments:  boolean;
  can_manage_alert_rules:   boolean;
  can_configure_weights:    boolean;
  invited_by:               string | null;
  joined_at:                string | null;
  last_active_at:           string | null;
  created_at:               string;
  updated_at:               string;
}

export interface OrgInvitation {
  id:          string;
  org_id:      string;
  email:       string;
  role:        OrgMemberRole;
  token:       string;
  status:      InviteStatus;
  invited_by:  string | null;
  accepted_by: string | null;
  expires_at:  string;
  accepted_at: string | null;
  created_at:  string;
}

export interface SsoConfiguration {
  id:                string;
  org_id:            string;
  provider_type:     SsoProviderType;
  is_active:         boolean;
  is_required:       boolean;
  provider_config:   Record<string, unknown>;
  attribute_mapping: Record<string, string>;
  allowed_domains:   string[];
  tested_at:         string | null;
  created_at:        string;
  updated_at:        string;
  configured_by:     string | null;
}

// ─── Risk Intelligence Engine — Couche 1 ─────────────────────────────────────

export interface RiskIndicatorCatalog {
  id:               string;
  dimension:        RiskDimension;
  key:              string;
  label_fr:         string;
  label_en:         string;
  description_fr:   string | null;
  description_en:   string | null;
  default_weight:   number;
  is_required:      boolean;
  is_qualitative:   boolean;
  scoring_guide:    Record<string, string> | null;  // { "0": "desc", "50": "desc", "100": "desc" }
  data_source_type: 'manual' | 'dun_bradstreet' | 'ecovadis' | 'oecd' | 'news_nlp' | null;
  api_field_path:   string | null;
  available_on:     OrgPlan[];
  sort_order:       number;
  created_at:       string;
}

export interface ScoringTemplate {
  id:                   string;
  org_id:               string | null;    // null = template système
  name:                 string;
  description:          string | null;
  industry:             string | null;
  is_system:            boolean;
  is_default:           boolean;
  weight_financial:     number;
  weight_operational:   number;
  weight_geopolitical:  number;
  weight_esg:           number;
  usage_count:          number;
  last_used_at:         string | null;
  created_at:           string;
  updated_at:           string;
  created_by:           string | null;
}

export interface TemplateIndicator {
  id:              string;
  template_id:     string;
  indicator_key:   string;
  weight:          number;
  is_active:       boolean;
  custom_label:    string | null;
  custom_guide:    Record<string, string> | null;
  created_at:      string;
}

export interface WeightProfile {
  id:                   string;
  org_id:               string;
  name:                 string;
  description:          string | null;
  based_on_template_id: string | null;
  weight_financial:     number;
  weight_operational:   number;
  weight_geopolitical:  number;
  weight_esg:           number;
  indicator_weights:    Record<string, number>;   // { credit_rating: 8, ... }
  indicator_active:     Record<string, boolean>;  // { carbon_footprint: true, ... }
  is_default:           boolean;
  version:              number;
  parent_id:            string | null;
  created_at:           string;
  updated_at:           string;
  created_by:           string | null;
}

export interface AssessmentWeightConfig {
  id:                   string;
  assessment_id:        string;
  org_id:               string;
  weight_profile_id:    string | null;
  template_id:          string | null;
  weight_financial:     number;
  weight_operational:   number;
  weight_geopolitical:  number;
  weight_esg:           number;
  indicator_weights:    Record<string, number>;
  indicator_active:     Record<string, boolean>;
  configured_by:        string | null;
  configuration_note:   string | null;
  is_locked:            boolean;
  created_at:           string;
  updated_at:           string;
}

// ─── Tables VendorShield (avec org_id ajouté) ────────────────────────────────

export interface Supplier {
  id:                   string;
  account_id:           string;
  org_id:               string | null;
  name:                 string;
  legal_name:           string | null;
  registration_number:  string | null;
  vat_number:           string | null;
  website:              string | null;
  description:          string | null;
  category:             SupplierCategory;
  status:               SupplierStatus;
  criticality:          SupplierCriticality;
  tags:                 string[];
  country_code:         string | null;
  country_name:         string | null;
  city:                 string | null;
  address:              string | null;
  region:               string | null;
  annual_revenue_eur:   number | null;
  employee_count:       number | null;
  founded_year:         number | null;
  credit_rating:        string | null;
  contract_start_date:  string | null;
  contract_end_date:    string | null;
  annual_spend_eur:     number | null;
  spend_percentage:     number | null;
  is_sole_source:       boolean;
  payment_terms_days:   number | null;
  global_score:         number | null;
  financial_score:      number | null;
  operational_score:    number | null;
  geopolitical_score:   number | null;
  esg_score:            number | null;
  risk_level:           RiskLevel | null;
  last_assessed_at:     string | null;
  created_at:           string;
  updated_at:           string;
  created_by:           string | null;
  updated_by:           string | null;
  notes:                string | null;
  metadata:             Record<string, unknown>;
}

export interface RiskAssessment {
  id:                   string;
  supplier_id:          string;
  account_id:           string;
  org_id:               string | null;
  title:                string;
  assessment_date:      string;
  next_review_date:     string | null;
  status:               AssessmentStatus;
  version:              number;
  global_score:         number | null;
  financial_score:      number | null;
  operational_score:    number | null;
  geopolitical_score:   number | null;
  esg_score:            number | null;
  weight_financial:     number;
  weight_operational:   number;
  weight_geopolitical:  number;
  weight_esg:           number;
  analyst_notes:        string | null;
  executive_summary:    string | null;
  mitigation_plan:      string | null;
  approved_by:          string | null;
  approved_at:          string | null;
  created_at:           string;
  updated_at:           string;
  created_by:           string | null;
  updated_by:           string | null;
}

export interface RiskFactor {
  id:             string;
  assessment_id:  string;
  account_id:     string;
  org_id:         string | null;
  dimension:      RiskDimension;
  factor_key:     string;
  factor_label:   string;
  score:          number;
  weight:         number;
  evidence:       string | null;
  data_source:    string | null;
  created_at:     string;
  updated_at:     string;
}

export interface Alert {
  id:               string;
  account_id:       string;
  org_id:           string | null;
  supplier_id:      string | null;
  assessment_id:    string | null;
  rule_id:          string | null;
  type:             AlertType;
  severity:         AlertSeverity;
  status:           AlertStatus;
  title:            string;
  message:          string;
  context:          Record<string, unknown>;
  score_snapshot:   number | null;
  score_delta:      number | null;
  acknowledged_by:  string | null;
  acknowledged_at:  string | null;
  resolved_by:      string | null;
  resolved_at:      string | null;
  resolution_note:  string | null;
  created_at:       string;
  updated_at:       string;
}

export interface AlertRule {
  id:                       string;
  account_id:               string;
  org_id:                   string | null;
  name:                     string;
  description:              string | null;
  is_active:                boolean;
  dimension:                RiskDimension | null;
  operator:                 '<' | '<=' | '>' | '>=';
  threshold:                number;
  severity:                 AlertSeverity;
  applies_to_category:      SupplierCategory | null;
  applies_to_criticality:   SupplierCriticality | null;
  notify_email:             boolean;
  created_at:               string;
  updated_at:               string;
  created_by:               string | null;
}

// ─── Vues ────────────────────────────────────────────────────────────────────

export interface SupplierRiskSummary extends Supplier {
  completed_assessments:  number;
  open_alerts:            number;
  critical_alerts:        number;
  last_assessment_date:   string | null;
}

export interface AccountRiskDashboard {
  account_id:             string;
  total_suppliers:        number;
  active_suppliers:       number;
  avg_global_score:       number | null;
  avg_financial_score:    number | null;
  avg_operational_score:  number | null;
  avg_geopolitical_score: number | null;
  avg_esg_score:          number | null;
  critical_risk_count:    number;
  high_risk_count:        number;
  medium_risk_count:      number;
  low_risk_count:         number;
  sole_source_count:      number;
  open_alerts_total:      number;
  critical_alerts_total:  number;
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low:      'text-green-700 bg-green-50 border-green-200',
  medium:   'text-orange-700 bg-orange-50 border-orange-200',
  high:     'text-red-700 bg-red-50 border-red-200',
  critical: 'text-red-900 bg-red-100 border-red-300',
};

export const RISK_LEVEL_SCORE_COLOR = (score: number | null): string => {
  if (score === null) return 'text-gray-400';
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-orange-600';
  if (score >= 20) return 'text-red-600';
  return 'text-red-800 font-bold';
};

export const CATEGORY_LABELS: Record<SupplierCategory, string> = {
  raw_materials: 'Matières premières', components: 'Composants',
  logistics: 'Logistique',            services: 'Services',
  technology: 'Technologie',          energy: 'Énergie',
  chemicals: 'Chimie',                packaging: 'Emballage',
  maintenance: 'Maintenance',         other: 'Autre',
};

export const STATUS_LABELS: Record<SupplierStatus, string> = {
  active: 'Actif',         under_review: 'En révision',
  suspended: 'Suspendu',   inactive: 'Inactif',
  blacklisted: 'Liste noire',
};

export const STATUS_COLORS: Record<SupplierStatus, string> = {
  active:       'text-green-700 bg-green-50',
  under_review: 'text-orange-700 bg-orange-50',
  suspended:    'text-red-700 bg-red-50',
  inactive:     'text-gray-600 bg-gray-100',
  blacklisted:  'text-red-900 bg-red-100',
};

export const CRITICALITY_LABELS: Record<SupplierCriticality, string> = {
  critical: 'Critique', high: 'Élevée', medium: 'Moyenne', low: 'Faible',
};

export const DIMENSION_LABELS: Record<RiskDimension, string> = {
  financial: 'Financier', operational: 'Opérationnel',
  geopolitical: 'Géopolitique', esg: 'Conformité ESG',
};

export const DIMENSION_COLORS: Record<RiskDimension, string> = {
  financial:    'text-blue-600 bg-blue-50',
  operational:  'text-orange-600 bg-orange-50',
  geopolitical: 'text-purple-600 bg-purple-50',
  esg:          'text-green-600 bg-green-50',
};

export const ROLE_LABELS: Record<OrgMemberRole, string> = {
  owner: 'Propriétaire', admin: 'Administrateur',
  analyst: 'Analyste',   viewer: 'Lecteur', auditor: 'Auditeur',
};

export const PLAN_LABELS: Record<OrgPlan, string> = {
  starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise', trial: 'Essai',
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Information', warning: 'Avertissement', critical: 'Critique',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info:     'text-blue-700 bg-blue-50',
  warning:  'text-orange-700 bg-orange-50',
  critical: 'text-red-700 bg-red-50',
};

export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: 'Brouillon', in_progress: 'En cours',
  completed: 'Complétée', approved: 'Approuvée', archived: 'Archivée',
};

// ─── Permissions par rôle ─────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<OrgMemberRole, {
  canCreateSupplier:    boolean;
  canEditSupplier:      boolean;
  canDeleteSupplier:    boolean;
  canCreateAssessment:  boolean;
  canApproveAssessment: boolean;
  canConfigureWeights:  boolean;
  canManageAlertRules:  boolean;
  canManageMembers:     boolean;
  canExport:            boolean;
  canViewAuditLog:      boolean;
  canManageBilling:     boolean;
  canConfigureSSO:      boolean;
}> = {
  owner:   { canCreateSupplier: true, canEditSupplier: true, canDeleteSupplier: true, canCreateAssessment: true, canApproveAssessment: true, canConfigureWeights: true, canManageAlertRules: true, canManageMembers: true, canExport: true, canViewAuditLog: true, canManageBilling: true, canConfigureSSO: true },
  admin:   { canCreateSupplier: true, canEditSupplier: true, canDeleteSupplier: true, canCreateAssessment: true, canApproveAssessment: true, canConfigureWeights: true, canManageAlertRules: true, canManageMembers: true, canExport: true, canViewAuditLog: true, canManageBilling: false, canConfigureSSO: true },
  analyst: { canCreateSupplier: true, canEditSupplier: true, canDeleteSupplier: false, canCreateAssessment: true, canApproveAssessment: false, canConfigureWeights: true, canManageAlertRules: false, canManageMembers: false, canExport: true, canViewAuditLog: false, canManageBilling: false, canConfigureSSO: false },
  viewer:  { canCreateSupplier: false, canEditSupplier: false, canDeleteSupplier: false, canCreateAssessment: false, canApproveAssessment: false, canConfigureWeights: false, canManageAlertRules: false, canManageMembers: false, canExport: true, canViewAuditLog: false, canManageBilling: false, canConfigureSSO: false },
  auditor: { canCreateSupplier: false, canEditSupplier: false, canDeleteSupplier: false, canCreateAssessment: false, canApproveAssessment: false, canConfigureWeights: false, canManageAlertRules: false, canManageMembers: false, canExport: true, canViewAuditLog: true, canManageBilling: false, canConfigureSSO: false },
};

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

export function scoreToRiskLevel(score: number | null): RiskLevel {
  if (score === null) return 'critical';
  if (score >= 70) return 'low';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'high';
  return 'critical';
}

export function formatEur(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(amount);
}

export function formatScore(score: number | null): string {
  if (score === null) return '—';
  return `${score}/100`;
}

export function getRoleColor(role: OrgMemberRole): string {
  const colors: Record<OrgMemberRole, string> = {
    owner:   'bg-yellow-100 text-yellow-800',
    admin:   'bg-blue-100 text-blue-800',
    analyst: 'bg-indigo-100 text-indigo-800',
    viewer:  'bg-green-100 text-green-800',
    auditor: 'bg-purple-100 text-purple-800',
  };
  return colors[role];
}
