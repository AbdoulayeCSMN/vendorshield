/**
 * Data Quality Gate - Validation Rules Engine
 * 8 MVP rules with Bloquant (critical) and Avertissement (warning) levels
 * Reference: TASK_PROGRESS/04-PHASE1-QUALITY-KPI.md
 */

export interface ValidationError {
  row_number: number;
  column_name: string;
  error_rule: string;
  error_level: 'Bloquant' | 'Avertissement';
  error_value: string;
  suggestion: string;
}

export interface DataQualityReport {
  total_rows: number;
  valid_rows: number;
  blocked_rows: number;
  warning_rows: number;
  quality_score: number; // percentage (0-100)
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface SupplierRow {
  row_number: number;
  supplier_id?: string;
  supplier_name?: string;
  date_prévue?: string;
  date_réelle?: string;
  ppm_value?: string | number;
  retard_jours?: string | number;
  statut?: string;
  quantité?: string | number;
  [key: string]: any;
}

/**
 * RULE 1 (BLOQUANT): Supplier ID is required
 */
function validateSupplierId(row: SupplierRow, supplierCache: Set<string>): ValidationError | null {
  if (!row.supplier_id || row.supplier_id.toString().trim() === '') {
    return {
      row_number: row.row_number,
      column_name: 'supplier_id',
      error_rule: 'Supplier ID required',
      error_level: 'Bloquant',
      error_value: String(row.supplier_id || '(empty)'),
      suggestion: 'Fournissez un identifiant fournisseur unique (ex: SUPP-12345)',
    };
  }
  return null;
}

/**
 * RULE 2 (BLOQUANT): Date format validation (ISO 8601 or DD/MM/YYYY)
 */
function validateDateFormat(
  row: SupplierRow,
  dateField: 'date_prévue' | 'date_réelle'
): ValidationError | null {
  const dateValue = row[dateField];
  if (!dateValue) return null; // Optional field

  const dateStr = String(dateValue).trim();
  // Accept ISO 8601 (YYYY-MM-DD) or DD/MM/YYYY
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  const frRegex = /^\d{2}\/\d{2}\/\d{4}$/;

  if (!isoRegex.test(dateStr) && !frRegex.test(dateStr)) {
    return {
      row_number: row.row_number,
      column_name: dateField,
      error_rule: 'Invalid date format',
      error_level: 'Bloquant',
      error_value: dateStr,
      suggestion: 'Utilisez le format YYYY-MM-DD (ISO) ou DD/MM/YYYY (France)',
    };
  }

  // Validate date is real
  try {
    const date = isoRegex.test(dateStr) ? new Date(dateStr) : parsefrDate(dateStr);
    if (isNaN(date.getTime())) {
      return {
        row_number: row.row_number,
        column_name: dateField,
        error_rule: 'Invalid date value',
        error_level: 'Bloquant',
        error_value: dateStr,
        suggestion: 'Vérifiez que la date existe (ex: pas 32/13/2023)',
      };
    }
  } catch {
    return {
      row_number: row.row_number,
      column_name: dateField,
      error_rule: 'Date parsing error',
      error_level: 'Bloquant',
      error_value: dateStr,
      suggestion: 'Format invalide - utilisez YYYY-MM-DD ou DD/MM/YYYY',
    };
  }

  return null;
}

/**
 * RULE 3 (BLOQUANT): date_réelle >= date_prévue (if both present)
 */
function validateDateLogic(row: SupplierRow): ValidationError | null {
  const datePrevu = row.date_prévue;
  const dateReelle = row.date_réelle;

  if (!datePrevu || !dateReelle) return null; // Only validate if both present

  try {
    const prevuObj = /^\d{4}-\d{2}-\d{2}$/.test(String(datePrevu))
      ? new Date(String(datePrevu))
      : parsefrDate(String(datePrevu));
    const realleObj = /^\d{4}-\d{2}-\d{2}$/.test(String(dateReelle))
      ? new Date(String(dateReelle))
      : parsefrDate(String(dateReelle));

    if (realleObj < prevuObj) {
      return {
        row_number: row.row_number,
        column_name: 'date_réelle',
        error_rule: 'Date réelle < Date prévue',
        error_level: 'Bloquant',
        error_value: `${dateReelle} < ${datePrevu}`,
        suggestion:
          'Vérifiez les dates - date réelle doit être >= date prévue ou corriger la date prévue',
      };
    }
  } catch (e) {
    // Skip if date parsing fails (will be caught by Rule 2)
  }

  return null;
}

/**
 * RULE 4 (BLOQUANT): PPM value between 0 and 1,000,000
 */
function validatePPM(row: SupplierRow): ValidationError | null {
  const ppmValue = row.ppm_value;
  if (ppmValue === undefined || ppmValue === null || ppmValue === '') return null; // Optional

  try {
    const ppm = Number(ppmValue);
    if (isNaN(ppm)) {
      return {
        row_number: row.row_number,
        column_name: 'ppm_value',
        error_rule: 'PPM non-numeric',
        error_level: 'Bloquant',
        error_value: String(ppmValue),
        suggestion: 'PPM doit être un nombre (ex: 5000 pour 5000 ppm)',
      };
    }

    if (ppm < 0 || ppm > 1000000) {
      return {
        row_number: row.row_number,
        column_name: 'ppm_value',
        error_rule: 'PPM out of range',
        error_level: 'Bloquant',
        error_value: String(ppm),
        suggestion: 'PPM doit être entre 0 et 1,000,000',
      };
    }
  } catch {
    return {
      row_number: row.row_number,
      column_name: 'ppm_value',
      error_rule: 'PPM parsing error',
      error_level: 'Bloquant',
      error_value: String(ppmValue),
      suggestion: 'Format invalide - utilisez un nombre décimal',
    };
  }

  return null;
}

/**
 * RULE 5 (AVERTISSEMENT): Delay <= 365 days
 */
function validateDelay(row: SupplierRow): ValidationError | null {
  const datePrevu = row.date_prévue;
  const dateReelle = row.date_réelle;

  if (!datePrevu || !dateReelle) return null;

  try {
    const prevuObj = /^\d{4}-\d{2}-\d{2}$/.test(String(datePrevu))
      ? new Date(String(datePrevu))
      : parsefrDate(String(datePrevu));
    const realleObj = /^\d{4}-\d{2}-\d{2}$/.test(String(dateReelle))
      ? new Date(String(dateReelle))
      : parsefrDate(String(dateReelle));

    const delayMs = realleObj.getTime() - prevuObj.getTime();
    const delayDays = Math.round(delayMs / (1000 * 60 * 60 * 24));

    if (delayDays > 365) {
      return {
        row_number: row.row_number,
        column_name: 'date_réelle',
        error_rule: 'Delay > 365 days',
        error_level: 'Avertissement',
        error_value: `${delayDays} days`,
        suggestion: `Retard important détecté (${delayDays} jours) - vérifier cause racine`,
      };
    }
  } catch {
    // Skip if date parsing fails
  }

  return null;
}

/**
 * RULE 6 (AVERTISSEMENT): Supplier exists in referential
 * Note: In MVP, we assume all suppliers in DB are valid
 */
function validateSupplierExists(
  row: SupplierRow,
  supplierCache: Set<string>
): ValidationError | null {
  const supplierId = row.supplier_id?.toString().trim();
  if (!supplierId) return null;

  if (supplierCache.size > 0 && !supplierCache.has(supplierId)) {
    return {
      row_number: row.row_number,
      column_name: 'supplier_id',
      error_rule: 'Supplier not in referential',
      error_level: 'Avertissement',
      error_value: supplierId,
      suggestion: 'Fournisseur non trouvé - créer nouveau fournisseur ou corriger ID',
    };
  }

  return null;
}

/**
 * RULE 7 (BLOQUANT): No exact row duplicates
 */
function validateNoDuplicates(
  row: SupplierRow,
  previousRows: Map<string, SupplierRow>
): ValidationError | null {
  // Create hash of key fields
  const hash = createRowHash(row);

  if (previousRows.has(hash)) {
    return {
      row_number: row.row_number,
      column_name: 'supplier_id',
      error_rule: 'Exact duplicate row',
      error_level: 'Bloquant',
      error_value: `Duplicate of row ${previousRows.get(hash)?.row_number}`,
      suggestion: 'Supprimer la ligne dupliquée',
    };
  }

  previousRows.set(hash, row);
  return null;
}

/**
 * RULE 8 (AVERTISSEMENT): Quantity > 0 if status = OK
 */
function validateQuantityLogic(row: SupplierRow): ValidationError | null {
  const status = row.statut?.toString().toLowerCase().trim();
  const quantity = row.quantité;

  if (status === 'ok' && (quantity === undefined || quantity === null || quantity === '')) {
    return {
      row_number: row.row_number,
      column_name: 'quantité',
      error_rule: 'Missing quantity for OK status',
      error_level: 'Avertissement',
      error_value: String(quantity || '(empty)'),
      suggestion: 'Si statut=OK, fournir une quantité > 0',
    };
  }

  if (status === 'ok' && quantity !== undefined && quantity !== null) {
    try {
      const qty = Number(quantity);
      if (!isNaN(qty) && qty <= 0) {
        return {
          row_number: row.row_number,
          column_name: 'quantité',
          error_rule: 'Invalid quantity for OK status',
          error_level: 'Avertissement',
          error_value: String(qty),
          suggestion: 'Quantité doit être > 0 pour statut OK',
        };
      }
    } catch {
      // Ignore parsing errors - will be caught elsewhere
    }
  }

  return null;
}

/**
 * Main validation function - runs all 8 rules against row
 */
export function validateRow(
  row: SupplierRow,
  supplierCache: Set<string> = new Set(),
  previousRows: Map<string, SupplierRow> = new Map()
): ValidationError[] {
  const errors: ValidationError[] = [];

  // BLOQUANT RULES (critical - block row if failed)
  const rule1 = validateSupplierId(row, supplierCache);
  if (rule1) errors.push(rule1);

  const rule2Prevu = validateDateFormat(row, 'date_prévue');
  if (rule2Prevu) errors.push(rule2Prevu);

  const rule2Reelle = validateDateFormat(row, 'date_réelle');
  if (rule2Reelle) errors.push(rule2Reelle);

  const rule3 = validateDateLogic(row);
  if (rule3) errors.push(rule3);

  const rule4 = validatePPM(row);
  if (rule4) errors.push(rule4);

  const rule7 = validateNoDuplicates(row, previousRows);
  if (rule7) errors.push(rule7);

  // AVERTISSEMENT RULES (warnings - don't block but flag)
  const rule5 = validateDelay(row);
  if (rule5) errors.push(rule5);

  const rule6 = validateSupplierExists(row, supplierCache);
  if (rule6) errors.push(rule6);

  const rule8 = validateQuantityLogic(row);
  if (rule8) errors.push(rule8);

  return errors;
}

/**
 * Batch validation across multiple rows
 */
export async function validateBatch(
  rows: SupplierRow[],
  supplierIds: string[] = []
): Promise<DataQualityReport> {
  const supplierCache = new Set(supplierIds);
  const previousRows = new Map<string, SupplierRow>();
  const allErrors: ValidationError[] = [];

  for (const row of rows) {
    const rowErrors = validateRow(row, supplierCache, previousRows);
    allErrors.push(...rowErrors);
  }

  const blockedCount = allErrors.filter((e) => e.error_level === 'Bloquant').length;
  const warningCount = allErrors.filter((e) => e.error_level === 'Avertissement').length;
  const validRows = rows.length - blockedCount;
  const qualityScore = rows.length > 0 ? Math.round((validRows / rows.length) * 100) : 100;

  return {
    total_rows: rows.length,
    valid_rows: validRows,
    blocked_rows: blockedCount,
    warning_rows: warningCount,
    quality_score: qualityScore,
    errors: allErrors.filter((e) => e.error_level === 'Bloquant'),
    warnings: allErrors.filter((e) => e.error_level === 'Avertissement'),
  };
}

/**
 * Helper: Convert FR date format DD/MM/YYYY to Date object
 */
function parsefrDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/**
 * Helper: Create hash of critical fields for duplicate detection
 */
function createRowHash(row: SupplierRow): string {
  const critical = [
    row.supplier_id,
    row.date_prévue,
    row.ppm_value,
    row.statut,
  ].join('|');
  // Simple hash - in production use crypto.subtle.digest()
  return Buffer.from(critical).toString('base64');
}
