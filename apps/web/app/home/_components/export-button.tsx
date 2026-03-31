'use client';

import { useState } from 'react';

import {
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExportType =
  | 'csv-suppliers'
  | 'json-suppliers'
  | 'csv-assessment'
  | 'json-assessment'
  | 'pdf-assessment';

interface ExportConfig {
  type:          ExportType;
  label:         string;
  icon:          React.ComponentType<{ className?: string }>;
  description:   string;
}

// ─── Configs disponibles selon le contexte ────────────────────────────────────

const SUPPLIER_EXPORTS: ExportConfig[] = [
  {
    type:        'csv-suppliers',
    label:       'CSV',
    icon:        FileSpreadsheet,
    description: 'Compatible Excel, Google Sheets',
  },
  {
    type:        'json-suppliers',
    label:       'JSON',
    icon:        FileCode,
    description: 'Données structurées complètes',
  },
];

const ASSESSMENT_EXPORTS: ExportConfig[] = [
  {
    type:        'pdf-assessment',
    label:       'PDF (rapport)',
    icon:        FileText,
    description: 'Rapport de conformité imprimable',
  },
  {
    type:        'csv-assessment',
    label:       'CSV (facteurs)',
    icon:        FileSpreadsheet,
    description: 'Détail des 24 critères',
  },
  {
    type:        'json-assessment',
    label:       'JSON (complet)',
    icon:        FileCode,
    description: 'Évaluation + facteurs + scores',
  },
];

// ─── Composant ────────────────────────────────────────────────────────────────

interface ExportButtonProps {
  /** 'suppliers' → export liste | 'assessment' → export évaluation */
  context:       'suppliers' | 'assessment';
  supplierId?:   string;
  assessmentId?: string;
  variant?:      'default' | 'outline' | 'ghost';
  size?:         'default' | 'sm' | 'lg' | 'icon';
  label?:        string;
}

export function ExportButton({
  context,
  supplierId,
  assessmentId,
  variant = 'outline',
  size = 'sm',
  label,
}: ExportButtonProps) {
  const [loading, setLoading] = useState<ExportType | null>(null);

  const configs = context === 'assessment' ? ASSESSMENT_EXPORTS : SUPPLIER_EXPORTS;

  const handleExport = async (type: ExportType) => {
    setLoading(type);
    try {
      const params = new URLSearchParams();
      if (supplierId)   params.set('supplier_id', supplierId);
      if (assessmentId) params.set('assessment_id', assessmentId);

      const url = `/api/exports/${type}?${params.toString()}`;

      if (type === 'pdf-assessment') {
        // Ouvrir dans un nouvel onglet pour impression navigateur
        window.open(url, '_blank');
      } else {
        // Téléchargement direct
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();
        const disposition = res.headers.get('content-disposition') ?? '';
        const filenameMatch = disposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch?.[1] ?? `export-${type}.${type.startsWith('json') ? 'json' : 'csv'}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export échoué : ${(err as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={loading !== null}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {label && <span className="ml-1.5">{label}</span>}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
          {context === 'assessment' ? 'Exporter l\'évaluation' : 'Exporter les fournisseurs'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {configs.map((cfg) => {
            const Icon = cfg.icon;
            const isLoading = loading === cfg.type;
            return (
              <DropdownMenuItem
                key={cfg.type}
                onClick={() => handleExport(cfg.type)}
                disabled={isLoading}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0 mt-0.5 text-gray-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{cfg.label}</p>
                    <p className="text-[10px] text-gray-400">{cfg.description}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
