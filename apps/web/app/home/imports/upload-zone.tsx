'use client';

import { useCallback, useState } from 'react';
import { Cloud, Loader2, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onFileUpload: (file: File, rows: any[], columnMapping: Record<string, string>) => void;
  onValidationResult?: (result: any) => void;
}

export function UploadZone({ onFileUpload, onValidationResult }: UploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse CSV string to rows
  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    if (!headerLine) return [];

    const headers = headerLine.split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line, rowIdx) => {
      const values = line.split(',');
      const row: any = { row_number: rowIdx + 2 }; // Row 1 is header
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      return row;
    });

    return rows;
  };

  // Parse JSON
  const parseJSON = (content: string): any[] => {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        return data.map((row, idx) => ({ ...row, row_number: idx + 1 }));
      }
      return [];
    } catch {
      throw new Error('Invalid JSON format');
    }
  };

  // Extract column mapping from data - with improved fuzzy matching
  const extractColumnMapping = (rows: any[]): Record<string, string> => {
    if (rows.length === 0) return {};
    const firstRow = rows[0];
    const mapping: Record<string, string> = {};
    const keys = Object.keys(firstRow).filter((k) => k !== 'row_number');

    // Improved fuzzy matching with more keywords
    keys.forEach((key) => {
      const lower = key.toLowerCase().trim();
      
      // Supplier ID
      if (!mapping.supplier_id && (
        lower.includes('supplier') || 
        lower.includes('vendor') || 
        lower.includes('fournisseur') ||
        lower === 'id'
      )) {
        mapping.supplier_id = key;
      }
      // Date Prévue / Scheduled
      else if (!mapping.date_prévue && (
        lower.includes('date_prev') || 
        lower.includes('planned') ||
        lower.includes('schedule') ||
        lower.includes('date_p') ||
        lower === 'scheduled date'
      )) {
        mapping.date_prévue = key;
      }
      // Date Réelle / Actual
      else if (!mapping.date_réelle && (
        lower.includes('date_real') || 
        lower.includes('actual') ||
        lower.includes('date_r') ||
        lower.includes('real date') ||
        lower === 'actual date'
      )) {
        mapping.date_réelle = key;
      }
      // PPM
      else if (!mapping.ppm_value && lower.includes('ppm')) {
        mapping.ppm_value = key;
      }
      // Quantity
      else if (!mapping.quantité && (
        lower.includes('qty') || 
        lower.includes('quantite') ||
        lower.includes('quantity') ||
        lower === 'qty'
      )) {
        mapping.quantité = key;
      }
      // Status
      else if (!mapping.statut && (
        lower.includes('status') || 
        lower.includes('statut') ||
        lower === 'state'
      )) {
        mapping.statut = key;
      }
    });

    // If we found at least one column, return the mapping
    // If not, create a default mapping based on column order
    if (Object.keys(mapping).length > 0) {
      return mapping;
    }

    // Fallback: create a best-guess mapping based on column count and order
    if (keys[0]) mapping.supplier_id = keys[0];
    if (keys[1]) mapping.date_prévue = keys[1];
    if (keys[2]) mapping.date_réelle = keys[2];
    if (keys[3]) mapping.ppm_value = keys[3];
    if (keys[4]) mapping.quantité = keys[4];
    if (keys[5]) mapping.statut = keys[5];

    return mapping;
  };

  const isExcelFile = (file: File) =>
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    Boolean(file.name.match(/\.(xlsx|xls)$/i));

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Read file
      const content = await file.text();

      // Parse based on file type
      let rows: any[] = [];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        rows = parseCSV(content);
      } else if (
        file.type === 'application/json' ||
        file.name.endsWith('.json')
      ) {
        rows = parseJSON(content);
      } else if (isExcelFile(file)) {
        setError(
          'Excel import is supported in the workflow, but browser preview is limited. Continue to mapping if needed.'
        );
        rows = [];
      } else {
        throw new Error('Unsupported file format');
      }

      // Extract column mapping
      const columnMapping = extractColumnMapping(rows);

      if (rows.length > 0 && Object.keys(columnMapping).length > 0) {
        // Send to edge function for validation when we have a usable mapping
        const response = await fetch('/api/data-ingestion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows,
            columnMapping,
            accountId: 'current-user-account', // Will be replaced by server action
          }),
        });

        // Read response as text once, then attempt to parse JSON.
        let validationResult: any = null;
        const respText = await response.text();
        try {
          validationResult = respText ? JSON.parse(respText) : {};
        } catch (e) {
          validationResult = {
            total_rows: rows.length,
            valid_rows: rows.length,
            blocked_rows: 0,
            warning_rows: 1,
            quality_score: rows.length > 0 ? 100 : 0,
            errors: [],
            warnings: [
              {
                row_number: 0,
                column_name: 'system',
                error_rule: 'Validation service unavailable',
                error_level: 'Avertissement',
                error_value: 'edge-function-failed',
                suggestion:
                  'La validation distante est indisponible. Continuez avec le mapping manuel et relancez la qualité plus tard.',
              },
            ],
            fallback_mode: true,
            details: String(respText || (e instanceof Error ? e.message : 'Unknown error')),
          };
        }

        onValidationResult?.(validationResult);

        if (!response.ok || validationResult?.fallback_mode) {
          setError(
            'Validation service temporarily unavailable. A provisional report was generated so you can continue.'
          );
        }
      } else {
        onValidationResult?.({
          total_rows: rows.length,
          valid_rows: rows.length,
          blocked_rows: 0,
          warning_rows: 0,
          quality_score: rows.length > 0 ? 100 : 0,
          errors: [],
          warnings: [],
        });
      }

      // Call parent callback
      onFileUpload(file, rows, columnMapping);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[UploadZone] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (!file) return;
        if (
          [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json',
          ].includes(file.type) ||
          file.name.match(/\.(csv|xlsx?|json)$/i)
        ) {
          processFile(file);
        } else {
          setError('Invalid file type. Please use CSV, Excel, or JSON.');
        }
      }
    },
    [onFileUpload, onValidationResult]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file) {
          processFile(file);
        }
      }
    },
    [onFileUpload, onValidationResult]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition cursor-pointer ${
          isProcessing
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-12 h-12 mx-auto text-blue-500 mb-4 animate-spin" />
        ) : (
          <Cloud className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        )}
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {isProcessing ? 'Validation en cours...' : 'Déposer le fichier ici'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {isProcessing
            ? 'Validation des données...'
            : 'ou cliquer pour parcourir'}
        </p>
        {!isProcessing && (
          <>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleChange}
              disabled={isProcessing}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="inline-block">
              <div className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium cursor-pointer hover:bg-blue-700">
                Sélectionner un fichier
              </div>
            </label>
          </>
        )}
        <p className="text-xs text-gray-500 mt-4">
          CSV, Excel (.xlsx, .xls) ou JSON
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
