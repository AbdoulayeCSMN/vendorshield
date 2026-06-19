// Constantes, types et helpers purs du module Conformité & Documents.
// (Séparé de document.actions.ts car un fichier 'use server' ne peut exporter
// que des fonctions async.)

export const DOC_TYPES = [
  { value: 'iso_9001', label: 'ISO 9001 (Qualité)' },
  { value: 'iso_14001', label: 'ISO 14001 (Environnement)' },
  { value: 'iso_27001', label: 'ISO 27001 (Sécurité info)' },
  { value: 'code_conduct', label: 'Code de conduite / éthique' },
  { value: 'vigilance_plan', label: 'Plan de vigilance' },
  { value: 'insurance', label: 'Assurance RC' },
  { value: 'contract', label: 'Contrat' },
  { value: 'audit_report', label: "Rapport d'audit" },
  { value: 'rgpd_dpa', label: 'DPA / RGPD' },
  { value: 'other', label: 'Autre' },
] as const;

// Documents recommandés pour la conformité (devoir de vigilance / CSRD).
export const REQUIRED_DOC_TYPES = [
  'iso_9001',
  'code_conduct',
  'vigilance_plan',
  'insurance',
] as const;

export type DocStatus = 'valid' | 'expiring' | 'expired' | 'no_expiry';

export interface SupplierDocument {
  id: string;
  doc_type: string;
  name: string;
  issuer: string | null;
  reference: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  notes: string | null;
  status: DocStatus;
}

export interface ComplianceSummary {
  documents: SupplierDocument[];
  required: { doc_type: string; present: boolean; status: DocStatus | null }[];
  expired_count: number;
  expiring_count: number;
  coverage: number; // % des documents requis présents et valides
}

export function docStatus(expiry: string | null): DocStatus {
  if (!expiry) return 'no_expiry';
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring';
  return 'valid';
}
