'use client';

import { useTranslation } from 'react-i18next';

import type {
  AlertSeverity,
  AssessmentStatus,
  RiskDimension,
  RiskLevel,
  SupplierCategory,
  SupplierCriticality,
  SupplierStatus,
} from './types';

/**
 * Returns translated label records for all enum types, keyed to the current
 * i18n language. Replaces the module-level UPPERCASE_LABELS constants in
 * types.ts that were hardcoded in French.
 */
export function useEnumLabels() {
  const { t } = useTranslation('vendorshield');

  const categoryLabels: Record<SupplierCategory, string> = {
    raw_materials: t('enums.category.raw_materials'),
    components:    t('enums.category.components'),
    logistics:     t('enums.category.logistics'),
    services:      t('enums.category.services'),
    technology:    t('enums.category.technology'),
    energy:        t('enums.category.energy'),
    chemicals:     t('enums.category.chemicals'),
    packaging:     t('enums.category.packaging'),
    maintenance:   t('enums.category.maintenance'),
    other:         t('enums.category.other'),
  };

  const criticalityLabels: Record<SupplierCriticality, string> = {
    critical: t('enums.criticality.critical'),
    high:     t('enums.criticality.high'),
    medium:   t('enums.criticality.medium'),
    low:      t('enums.criticality.low'),
  };

  const statusLabels: Record<SupplierStatus, string> = {
    active:       t('enums.status.active'),
    under_review: t('enums.status.under_review'),
    suspended:    t('enums.status.suspended'),
    inactive:     t('enums.status.inactive'),
    blacklisted:  t('enums.status.blacklisted'),
  };

  const riskLevelLabels: Record<RiskLevel, string> = {
    low:      t('enums.riskLevel.low'),
    medium:   t('enums.riskLevel.medium'),
    high:     t('enums.riskLevel.high'),
    critical: t('enums.riskLevel.critical'),
  };

  const dimensionLabels: Record<RiskDimension, string> = {
    financial:    t('dashboard.dimFinancial'),
    operational:  t('dashboard.dimOperational'),
    geopolitical: t('dashboard.dimGeopolitical'),
    esg:          t('dashboard.dimEsg'),
  };

  const severityLabels: Record<AlertSeverity, string> = {
    info:     t('alerts.rules.severityInfo'),
    warning:  t('alerts.rules.severityWarning'),
    critical: t('alerts.rules.severityCritical'),
  };

  const assessmentStatusLabels: Record<AssessmentStatus, string> = {
    draft:       t('assessments.statusDraft'),
    in_progress: t('assessments.statusInProgress'),
    completed:   t('assessments.statusCompleted'),
    approved:    t('assessments.statusApproved'),
    archived:    t('assessments.statusArchived'),
  };

  return {
    categoryLabels,
    criticalityLabels,
    statusLabels,
    riskLevelLabels,
    dimensionLabels,
    severityLabels,
    assessmentStatusLabels,
  };
}
