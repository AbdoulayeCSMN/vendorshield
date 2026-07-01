'use client';

import { Fragment, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Card } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Upload, File, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { UploadZone } from './upload-zone';
import { ColumnMapping } from './column-mapping';
import { QualityReport, ValidationError } from './quality-report';
import { ImportHistory } from './import-history';
import {
  commitImportAction,
  commitSupplierImportAction,
} from '~/lib/vendorshield/actions/import.actions';

type ImportType = 'suppliers' | 'deliveries';

interface ValidationResult {
  total_rows: number;
  valid_rows: number;
  blocked_rows: number;
  warning_rows: number;
  quality_score: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export default function ImportsPage() {
  const { t } = useTranslation('vendorshield');
  const [importType, setImportType] = useState<ImportType>('suppliers');
  const [step, setStep] = useState<'upload' | 'mapping' | 'quality' | 'confirm'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'mapping' | 'validating' | 'importing'>('idle');

  const handleFileUpload = (file: File, rows: any[], mapping: Record<string, string>) => {
    setUploadedFile(file);
    setParsedRows(rows);
    setColumnMapping(mapping);
    setStep('mapping');
  };

  const handleValidationResult = (result: ValidationResult) => {
    setValidationResult(result);
  };

  const handleMappingComplete = () => {
    setStep('quality');
  };

  const handleQualityReview = () => {
    // Only advance if quality score >= 80 and no blocked rows
    if (validationResult && validationResult.quality_score >= 80 && validationResult.blocked_rows === 0) {
      setStep('confirm');
    }
  };

  const handleImportStart = async () => {
    if (!uploadedFile || !validationResult) return;

    setImportStatus('importing');
    try {
      const payload = {
        rows: parsedRows,
        columnMapping,
        filename: uploadedFile.name,
        fileType: uploadedFile.name.split('.').pop()?.toLowerCase() || 'csv',
        qualityScore: validationResult.quality_score,
      };

      if (importType === 'suppliers') {
        const result = await commitSupplierImportAction(payload);
        if (!result.success) {
          toast.error(result.error);
          setImportStatus('idle');
          return;
        }
        toast.success(
          t('imports.suppliersImported', { count: result.data.imported }) +
            (result.data.skipped > 0 ? ` · ${t('imports.skippedImport', { count: result.data.skipped })}` : ''),
        );
      } else {
        const result = await commitImportAction(payload);
        if (!result.success) {
          toast.error(result.error);
          setImportStatus('idle');
          return;
        }
        toast.success(
          t('imports.rowsImported', { count: result.data.imported, matched: result.data.matched }) +
            (result.data.unmatched > 0 ? ` · ${t('imports.unmatched', { count: result.data.unmatched })}` : ''),
        );
      }

      setUploadedFile(null);
      setParsedRows([]);
      setColumnMapping({});
      setValidationResult(null);
      setImportStatus('idle');
      setStep('upload');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(t('imports.failed'));
      setImportStatus('idle');
    }
  };

  const canProceedToConfirm =
    validationResult &&
    validationResult.quality_score >= 80 &&
    validationResult.blocked_rows === 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('imports.title')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('imports.desc')}
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={step} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" disabled={step !== 'upload' && !uploadedFile}>
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="mapping" disabled={!uploadedFile}>
            <div className="flex items-center gap-2">
              <File className="w-4 h-4" />
              <span className="hidden sm:inline">Mapping</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="quality" disabled={step === 'upload' || !uploadedFile}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('imports.tabQuality')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="confirm" disabled={!canProceedToConfirm}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('imports.tabConfirm')}</span>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Upload */}
        <TabsContent value="upload">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('imports.step1')}</h2>

            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('imports.whatToImport')}</p>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {([
                  { v: 'suppliers', t: t('imports.typeSuppliers'), d: t('imports.typeSuppliersDesc') },
                  { v: 'deliveries', t: t('imports.typeDeliveries'), d: t('imports.typeDeliveriesDesc') },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setImportType(opt.v)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      importType === opt.v
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.t}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.d}</p>
                  </button>
                ))}
              </div>
            </div>

            <UploadZone onFileUpload={handleFileUpload} onValidationResult={handleValidationResult} />
          </Card>
        </TabsContent>

        {/* Step 2: Column Mapping */}
        <TabsContent value="mapping">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('imports.step2')}</h2>
            {uploadedFile && (
              <Fragment>
                <ColumnMapping
                  rows={parsedRows}
                  importType={importType}
                  onComplete={(m) => {
                    setColumnMapping(m);
                    handleMappingComplete();
                  }}
                />
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('upload');
                      setUploadedFile(null);
                    }}
                  >
                    {t('imports.back')}
                  </Button>
                </div>
              </Fragment>
            )}
          </Card>
        </TabsContent>

        {/* Step 3: Quality Report */}
        <TabsContent value="quality">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('imports.step3')}</h2>
            {validationResult && (
              <Fragment>
                <QualityReport
                  totalRows={validationResult.total_rows}
                  validRows={validationResult.valid_rows}
                  blockedRows={validationResult.blocked_rows}
                  warningRows={validationResult.warning_rows}
                  qualityScore={validationResult.quality_score}
                  errors={validationResult.errors}
                  warnings={validationResult.warnings}
                />
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep('mapping')}>
                    {t('imports.back')}
                  </Button>
                  <Button
                    onClick={handleQualityReview}
                    disabled={!canProceedToConfirm}
                  >
                    {canProceedToConfirm ? t('imports.continue') : t('imports.fixErrors')}
                  </Button>
                </div>
              </Fragment>
            )}
          </Card>
        </TabsContent>

        {/* Step 4: Confirm & Import */}
        <TabsContent value="confirm">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('imports.step4')}</h2>
            <p className="text-sm text-gray-600">{t('imports.step4Desc')}</p>

            <div className="space-y-3 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-xs text-blue-600">{t('imports.fileLabel')}</p>
                <p className="text-sm text-blue-900 font-medium">{uploadedFile?.name}</p>
              </div>

              {validationResult && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-xs text-green-600">{t('imports.summaryLabel')}</p>
                  <p className="text-sm text-green-900 font-medium">
                    {t('imports.readyRows', { count: validationResult.valid_rows, score: validationResult.quality_score })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep('quality')}>
                {t('imports.back')}
              </Button>
              <Button
                onClick={handleImportStart}
                disabled={importStatus === 'importing'}
              >
                {importStatus === 'importing' ? t('imports.importing') : t('imports.launch')}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Imports */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t('imports.recentImports')}</h2>
        <ImportHistory />
      </Card>
    </div>
  );
}
