// Champs canoniques cibles de l'import (partagés entre l'UI de mapping et
// l'action de suggestion LLM). La clé est celle utilisée par columnMapping.

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}

export const SUPPLIER_FIELDS: ImportField[] = [
  { key: 'name', label: 'Nom du fournisseur', required: true },
  { key: 'registration_number', label: "N° d'enregistrement / SIREN" },
  { key: 'country_code', label: 'Code pays (ISO 2 lettres)' },
  { key: 'country_name', label: 'Pays' },
  { key: 'city', label: 'Ville' },
  { key: 'category', label: 'Catégorie', hint: 'raw_materials, components, logistics, services, technology, energy, chemicals, packaging, maintenance, other' },
  { key: 'criticality', label: 'Criticité', hint: 'critical, high, medium, low' },
  { key: 'status', label: 'Statut', hint: 'active, under_review, suspended, inactive, blacklisted' },
  { key: 'annual_spend_eur', label: 'Dépense annuelle (€)' },
  { key: 'employee_count', label: 'Effectif' },
  { key: 'founded_year', label: 'Année de création' },
  { key: 'credit_rating', label: 'Note de crédit' },
  { key: 'is_sole_source', label: 'Mono-source (oui/non)' },
  { key: 'website', label: 'Site web' },
  { key: 'global_score', label: 'Score global (0-100)' },
  { key: 'financial_score', label: 'Score financier (0-100)' },
  { key: 'operational_score', label: 'Score opérationnel (0-100)' },
  { key: 'geopolitical_score', label: 'Score géopolitique (0-100)' },
  { key: 'esg_score', label: 'Score ESG (0-100)' },
];

export const DELIVERY_FIELDS: ImportField[] = [
  { key: 'supplier_id', label: 'Fournisseur (nom ou n°)', required: true },
  { key: 'date_prévue', label: 'Date prévue' },
  { key: 'date_réelle', label: 'Date réelle' },
  { key: 'ppm_value', label: 'PPM (défauts)' },
  { key: 'quantité', label: 'Quantité' },
  { key: 'statut', label: 'Statut livraison' },
];

export function fieldsFor(type: 'suppliers' | 'deliveries'): ImportField[] {
  return type === 'suppliers' ? SUPPLIER_FIELDS : DELIVERY_FIELDS;
}
