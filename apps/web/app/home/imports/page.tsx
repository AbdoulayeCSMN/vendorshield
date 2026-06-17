'use client';

import { Fragment, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Card } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Upload, File, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadZone } from './upload-zone';
import { ColumnMapping } from './column-mapping';
import { QualityReport, ValidationError } from './quality-report';
import { ImportHistory } from './import-history';

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
      // Here you would call the actual import API endpoint
      // For now, show success message
      console.log('Import started', {
        file: uploadedFile.name,
        rows: validationResult.valid_rows,
        quality: validationResult.quality_score,
      });

      // Reset after successful import
      setTimeout(() => {
        setUploadedFile(null);
        setParsedRows([]);
        setColumnMapping({});
        setValidationResult(null);
        setImportStatus('idle');
        setStep('upload');
      }, 1500);
    } catch (error) {
      console.error('Import failed:', error);
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
        <h1 className="text-2xl font-bold text-gray-900">Importer des données</h1>
        <p className="text-sm text-gray-600 mt-1">
          Chargez vos fichiers CSV, Excel ou JSON pour ajouter des fournisseurs et commandes
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
              <span className="hidden sm:inline">Qualité</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="confirm" disabled={!canProceedToConfirm}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Confirmer</span>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Upload */}
        <TabsContent value="upload">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Étape 1 : Charger un fichier</h2>
            <UploadZone onFileUpload={handleFileUpload} onValidationResult={handleValidationResult} />
          </Card>
        </TabsContent>

        {/* Step 2: Column Mapping */}
        <TabsContent value="mapping">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Étape 2 : Mapper les colonnes</h2>
            {uploadedFile && (
              <Fragment>
                <ColumnMapping file={uploadedFile} onComplete={handleMappingComplete} />
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('upload');
                      setUploadedFile(null);
                    }}
                  >
                    Retour
                  </Button>
                  <Button onClick={handleMappingComplete}>Continuer</Button>
                </div>
              </Fragment>
            )}
          </Card>
        </TabsContent>

        {/* Step 3: Quality Report */}
        <TabsContent value="quality">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Étape 3 : Rapport de qualité</h2>
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
                    Retour
                  </Button>
                  <Button
                    onClick={handleQualityReview}
                    disabled={!canProceedToConfirm}
                  >
                    {canProceedToConfirm ? 'Continuer' : 'Corriger les erreurs'}
                  </Button>
                </div>
              </Fragment>
            )}
          </Card>
        </TabsContent>

        {/* Step 4: Confirm & Import */}
        <TabsContent value="confirm">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Étape 4 : Confirmer l'import</h2>
            <p className="text-sm text-gray-600">Vérifiez les informations avant de commencer l'import.</p>

            <div className="space-y-3 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-xs text-blue-600">Fichier</p>
                <p className="text-sm text-blue-900 font-medium">{uploadedFile?.name}</p>
              </div>

              {validationResult && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-xs text-green-600">Résumé</p>
                  <p className="text-sm text-green-900 font-medium">
                    {validationResult.valid_rows} lignes prêtes à importer • Qualité :{' '}
                    <span className="font-bold">{validationResult.quality_score}%</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep('quality')}>
                Retour
              </Button>
              <Button
                onClick={handleImportStart}
                disabled={importStatus === 'importing'}
              >
                {importStatus === 'importing' ? 'Import en cours...' : 'Lancer l\'import'}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Imports */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Imports récents</h2>
        <ImportHistory />
      </Card>
    </div>
  );
}
