// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Type definitions
interface ValidationError {
  row_number: number;
  column_name: string;
  error_rule: string;
  error_level: "Bloquant" | "Avertissement";
  error_value: string;
  suggestion: string;
}

interface SupplierRow {
  row_number: number;
  [key: string]: any;
}

/**
 * PHASE 1.2 - Data Quality Gate - 8 MVP Validation Rules
 * Ref: TASK_PROGRESS/04-PHASE1-QUALITY-KPI.md
 */

// RULE 1 (BLOQUANT): Supplier ID required
function validateSupplierId(row: SupplierRow, supplier_id: any): ValidationError | null {
  if (!supplier_id || String(supplier_id).trim() === "") {
    return {
      row_number: row.row_number,
      column_name: "supplier_id",
      error_rule: "Supplier ID required",
      error_level: "Bloquant",
      error_value: String(supplier_id || "(empty)"),
      suggestion: "Fournissez un identifiant fournisseur unique (ex: SUPP-12345)",
    };
  }
  return null;
}

// RULE 2 (BLOQUANT): Date format validation (ISO 8601 or DD/MM/YYYY)
function validateDateFormat(
  row: SupplierRow,
  dateValue: any,
  fieldName: string
): ValidationError | null {
  if (!dateValue) return null; // Optional

  const dateStr = String(dateValue).trim();
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  const frRegex = /^\d{2}\/\d{2}\/\d{4}$/;

  if (!isoRegex.test(dateStr) && !frRegex.test(dateStr)) {
    return {
      row_number: row.row_number,
      column_name: fieldName,
      error_rule: "Invalid date format",
      error_level: "Bloquant",
      error_value: dateStr,
      suggestion: "Utilisez le format YYYY-MM-DD (ISO) ou DD/MM/YYYY (France)",
    };
  }

  // Validate date is real
  try {
    const date =
      isoRegex.test(dateStr) ? new Date(dateStr) : parsefrDate(dateStr);
    if (isNaN(date.getTime())) {
      return {
        row_number: row.row_number,
        column_name: fieldName,
        error_rule: "Invalid date value",
        error_level: "Bloquant",
        error_value: dateStr,
        suggestion: "Vérifiez que la date existe (ex: pas 32/13/2023)",
      };
    }
  } catch {
    return {
      row_number: row.row_number,
      column_name: fieldName,
      error_rule: "Date parsing error",
      error_level: "Bloquant",
      error_value: dateStr,
      suggestion: "Format invalide - utilisez YYYY-MM-DD ou DD/MM/YYYY",
    };
  }

  return null;
}

// RULE 3 (BLOQUANT): date_réelle >= date_prévue
function validateDateLogic(
  row: SupplierRow,
  datePrevu: any,
  dateReelle: any
): ValidationError | null {
  if (!datePrevu || !dateReelle) return null;

  try {
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    const prevuObj = isoRegex.test(String(datePrevu))
      ? new Date(String(datePrevu))
      : parsefrDate(String(datePrevu));
    const realleObj = isoRegex.test(String(dateReelle))
      ? new Date(String(dateReelle))
      : parsefrDate(String(dateReelle));

    if (realleObj < prevuObj) {
      return {
        row_number: row.row_number,
        column_name: "date_réelle",
        error_rule: "Date réelle < Date prévue",
        error_level: "Bloquant",
        error_value: `${dateReelle} < ${datePrevu}`,
        suggestion:
          "Vérifiez les dates - date réelle doit être >= date prévue",
      };
    }
  } catch {
    // Skip if date parsing fails
  }

  return null;
}

// RULE 4 (BLOQUANT): PPM value between 0 and 1,000,000
function validatePPM(row: SupplierRow, ppmValue: any): ValidationError | null {
  if (ppmValue === undefined || ppmValue === null || ppmValue === "")
    return null;

  try {
    const ppm = Number(ppmValue);
    if (isNaN(ppm)) {
      return {
        row_number: row.row_number,
        column_name: "ppm_value",
        error_rule: "PPM non-numeric",
        error_level: "Bloquant",
        error_value: String(ppmValue),
        suggestion: "PPM doit être un nombre (ex: 5000 pour 5000 ppm)",
      };
    }

    if (ppm < 0 || ppm > 1000000) {
      return {
        row_number: row.row_number,
        column_name: "ppm_value",
        error_rule: "PPM out of range",
        error_level: "Bloquant",
        error_value: String(ppm),
        suggestion: "PPM doit être entre 0 et 1,000,000",
      };
    }
  } catch {
    return {
      row_number: row.row_number,
      column_name: "ppm_value",
      error_rule: "PPM parsing error",
      error_level: "Bloquant",
      error_value: String(ppmValue),
      suggestion: "Format invalide - utilisez un nombre décimal",
    };
  }

  return null;
}

// RULE 5 (AVERTISSEMENT): Delay <= 365 days
function validateDelay(
  row: SupplierRow,
  datePrevu: any,
  dateReelle: any
): ValidationError | null {
  if (!datePrevu || !dateReelle) return null;

  try {
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    const prevuObj = isoRegex.test(String(datePrevu))
      ? new Date(String(datePrevu))
      : parsefrDate(String(datePrevu));
    const realleObj = isoRegex.test(String(dateReelle))
      ? new Date(String(dateReelle))
      : parsefrDate(String(dateReelle));

    const delayMs = realleObj.getTime() - prevuObj.getTime();
    const delayDays = Math.round(delayMs / (1000 * 60 * 60 * 24));

    if (delayDays > 365) {
      return {
        row_number: row.row_number,
        column_name: "date_réelle",
        error_rule: "Delay > 365 days",
        error_level: "Avertissement",
        error_value: `${delayDays} days`,
        suggestion: `Retard important détecté (${delayDays} jours) - vérifier cause racine`,
      };
    }
  } catch {
    // Skip
  }

  return null;
}

// RULE 6 (AVERTISSEMENT): Supplier exists in referential
function validateSupplierExists(
  row: SupplierRow,
  supplierId: any,
  supplierIds: Set<string>
): ValidationError | null {
  const id = supplierId?.toString().trim();
  if (!id) return null;

  if (supplierIds.size > 0 && !supplierIds.has(id)) {
    return {
      row_number: row.row_number,
      column_name: "supplier_id",
      error_rule: "Supplier not in referential",
      error_level: "Avertissement",
      error_value: id,
      suggestion: "Fournisseur non trouvé - créer nouveau fournisseur ou corriger ID",
    };
  }

  return null;
}

// RULE 7 (BLOQUANT): No exact row duplicates
function validateNoDuplicates(
  row: SupplierRow,
  supplierId: any,
  datePrevu: any,
  ppmValue: any,
  statut: any,
  seenHashes: Set<string>
): ValidationError | null {
  const hash = createRowHash({
    supplier_id: supplierId,
    date_prévue: datePrevu,
    ppm_value: ppmValue,
    statut: statut,
  });

  if (seenHashes.has(hash)) {
    return {
      row_number: row.row_number,
      column_name: "supplier_id",
      error_rule: "Exact duplicate row",
      error_level: "Bloquant",
      error_value: "Duplicate detected",
      suggestion: "Supprimer la ligne dupliquée",
    };
  }

  seenHashes.add(hash);
  return null;
}

// RULE 8 (AVERTISSEMENT): Quantity > 0 if status = OK
function validateQuantityLogic(
  row: SupplierRow,
  statut: any,
  quantite: any
): ValidationError | null {
  const status = statut?.toString().toLowerCase().trim();

  if (status === "ok") {
    if (!quantite || quantite === "") {
      return {
        row_number: row.row_number,
        column_name: "quantité",
        error_rule: "Missing quantity for OK status",
        error_level: "Avertissement",
        error_value: String(quantite || "(empty)"),
        suggestion: "Si statut=OK, fournir une quantité > 0",
      };
    }

    try {
      const qty = Number(quantite);
      if (!isNaN(qty) && qty <= 0) {
        return {
          row_number: row.row_number,
          column_name: "quantité",
          error_rule: "Invalid quantity for OK status",
          error_level: "Avertissement",
          error_value: String(qty),
          suggestion: "Quantité doit être > 0 pour statut OK",
        };
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

// Helper functions
function parsefrDate(dateStr: string): Date {
  const parts = dateStr.split("/").map((p) => Number(p));
  const day = parts[0] || 1;
  const month = parts[1] || 1;
  const year = parts[2] || new Date().getFullYear();
  return new Date(year, month - 1, day);
}

function createRowHash(obj: Record<string, any>): string {
  const str = Object.values(obj).join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Main request handler
serve(async (req: any) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request
    const body = await req.json();
    const rows: SupplierRow[] = body.rows || [];
    const columnMapping: Record<string, string> = body.columnMapping || {};
    const mappedKey = (k: string) => {
      const v = columnMapping[k];
      return typeof v === "string" && v.length > 0 ? v : k;
    };
    const accountId: string = body.accountId || "";

    if (!accountId || !rows.length) {
      return new Response(
        JSON.stringify({ error: "Missing accountId or rows" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase (guard env)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseKey) {
      console.error("[data-ingestion] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Validation service misconfigured: missing env" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing suppliers for validation (with error check)
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("account_id", accountId);

    if (suppliersError) {
      console.error("[data-ingestion] Supabase suppliers fetch error:", suppliersError);
      return new Response(
        JSON.stringify({ error: "Validation service unavailable", details: String(suppliersError) }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const supplierIds = new Set<string>((suppliers || []).map((s: any) => String(s.id)));

    // Validate all rows with all 8 rules
    const seenHashes = new Set<string>();
    const allErrors: ValidationError[] = [];

    // helper to safely read a mapped key from a row
    const getRowValue = (r: SupplierRow, key: string) => {
      try {
        return r == null ? undefined : r[String(key)];
      } catch {
        return undefined;
      }
    };

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      if (row == null) continue;
      if (row.row_number == null) row.row_number = idx + 1;

      const supplier_id = getRowValue(row, mappedKey("supplier_id"));
      const date_prévue = getRowValue(row, mappedKey("date_prévue"));
      const date_réelle = getRowValue(row, mappedKey("date_réelle"));
      const ppm_value = getRowValue(row, mappedKey("ppm_value"));
      const quantité = getRowValue(row, mappedKey("quantité"));
      const statut = getRowValue(row, mappedKey("statut"));

      // Apply all 8 rules
      const rules = [
        validateSupplierId(row, supplier_id),
        validateDateFormat(row, date_prévue, "date_prévue"),
        validateDateFormat(row, date_réelle, "date_réelle"),
        validateDateLogic(row, date_prévue, date_réelle),
        validatePPM(row, ppm_value),
        validateSupplierExists(row, supplier_id, supplierIds),
        validateNoDuplicates(row, supplier_id, date_prévue, ppm_value, statut, seenHashes),
        validateQuantityLogic(row, statut, quantité),
        validateDelay(row, date_prévue, date_réelle),
      ];

      for (const error of rules) {
        if (error) {
          allErrors.push(error);
        }
      }
    }

    // Calculate quality metrics by distinct rows, not number of error entries.
    const blockedRowNumbers = new Set(
      allErrors
        .filter((e) => e.error_level === "Bloquant")
        .map((e) => e.row_number)
    );
    const warningRowNumbers = new Set(
      allErrors
        .filter((e) => e.error_level === "Avertissement")
        .map((e) => e.row_number)
    );
    const blockedRows = blockedRowNumbers.size;
    const validRows = Math.max(0, rows.length - blockedRows);
    const qualityScore = rows.length > 0 ? Math.round((validRows / rows.length) * 100) : 100;

    return new Response(
      JSON.stringify({
        total_rows: rows.length,
        valid_rows: validRows,
        blocked_rows: blockedRows,
        warning_rows: warningRowNumbers.size,
        quality_score: qualityScore,
        errors: allErrors.filter((e) => e.error_level === "Bloquant"),
        warnings: allErrors.filter((e) => e.error_level === "Avertissement"),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[data-ingestion] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
