'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export interface ValidationError {
  row_number: number;
  column_name: string;
  error_rule: string;
  error_level: 'Bloquant' | 'Avertissement';
  error_value: string;
  suggestion: string;
}

interface QualityReportProps {
  totalRows?: number;
  validRows?: number;
  blockedRows?: number;
  warningRows?: number;
  qualityScore?: number;
  errors?: ValidationError[];
  warnings?: ValidationError[];
}

export function QualityReport({
  totalRows = 0,
  validRows = 0,
  blockedRows = 0,
  warningRows = 0,
  qualityScore = 0,
  errors = [],
  warnings = [],
}: QualityReportProps) {
  const [expandErrors, setExpandErrors] = useState(true);
  const [expandWarnings, setExpandWarnings] = useState(false);

  const canImport = qualityScore >= 80 && blockedRows === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Report</CardTitle>
          <CardDescription>
            Validation results - {canImport ? '✅ Ready to import' : '⚠️ Review required'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quality Score */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Quality Score</span>
              <span className={`text-lg font-bold ${qualityScore >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                {qualityScore}%
              </span>
            </div>
            <progress 
              value={qualityScore} 
              max={100} 
              className={`w-full h-2 rounded ${qualityScore >= 80 ? 'accent-green-500' : 'accent-amber-500'}`}
            />
          </div>

          {/* Row Breakdown Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-gray-600">Total Rows</span>
              <p className="text-2xl font-bold text-slate-900">{totalRows}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-xs text-green-700">Valid</span>
              <p className="text-2xl font-bold text-green-600">{validRows}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-xs text-red-700">Blocked</span>
              <p className="text-2xl font-bold text-red-600">{blockedRows}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-xs text-amber-700">Warnings</span>
              <p className="text-2xl font-bold text-amber-600">{warningRows}</p>
            </div>
          </div>

          {/* Errors Section (Bloquant) */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setExpandErrors(!expandErrors)}
                className="w-full flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900 flex-1 text-left">
                  Critical Errors ({errors.length})
                </span>
                {expandErrors ? (
                  <ChevronUp className="w-4 h-4 text-red-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-red-600" />
                )}
              </button>
              {expandErrors && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs text-red-700">Row {error.row_number}</span>
                        <span className="text-xs font-semibold text-red-600">{error.error_rule}</span>
                      </div>
                      <p className="text-red-900">
                        <span className="font-medium">{error.column_name}</span>: "{error.error_value}"
                      </p>
                      <p className="text-red-700 text-xs">
                        ✏️ {error.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warnings Section (Avertissement) */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setExpandWarnings(!expandWarnings)}
                className="w-full flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-900 flex-1 text-left">
                  Warnings ({warnings.length})
                </span>
                {expandWarnings ? (
                  <ChevronUp className="w-4 h-4 text-amber-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-600" />
                )}
              </button>
              {expandWarnings && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {warnings.map((warning, idx) => (
                    <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs text-amber-700">Row {warning.row_number}</span>
                        <span className="text-xs font-semibold text-amber-600">{warning.error_rule}</span>
                      </div>
                      <p className="text-amber-900">
                        <span className="font-medium">{warning.column_name}</span>: "{warning.error_value}"
                      </p>
                      <p className="text-amber-700 text-xs">
                        💡 {warning.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {blockedRows === 0 && errors.length === 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-900">
                All rows passed validation ✨
              </p>
            </div>
          )}

          {/* Import Ready Badge */}
          {canImport && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ✅ Quality score is {qualityScore}% - data is ready to import
              </p>
            </div>
          )}

          {!canImport && blockedRows > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                ❌ Import blocked - {blockedRows} critical error{blockedRows !== 1 ? 's' : ''} must be fixed before proceeding
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
