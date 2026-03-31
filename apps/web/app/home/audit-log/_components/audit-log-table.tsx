'use client';

import { useCallback, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Archive,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FilePlus,
  FileSearch,
  Pencil,
  Shield,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type { AuditFilters, AuditLogEntry } from '~/lib/vendorshield/alerts.server';
import type { AuditAction } from '~/lib/vendorshield/types';

// ─── Config actions ───────────────────────────────────────────────────────────

const ACTION_CFG: Record<AuditAction, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  cls: string;
}> = {
  create:  { label: 'Création',     icon: FilePlus,    cls: 'text-green-700 bg-green-50' },
  update:  { label: 'Modification', icon: Pencil,      cls: 'text-blue-700 bg-blue-50' },
  delete:  { label: 'Suppression',  icon: Trash2,      cls: 'text-red-700 bg-red-50' },
  view:    { label: 'Consultation', icon: Eye,         cls: 'text-gray-600 bg-gray-50' },
  export:  { label: 'Export',       icon: Download,    cls: 'text-purple-700 bg-purple-50' },
  approve: { label: 'Approbation',  icon: CheckCircle, cls: 'text-emerald-700 bg-emerald-50' },
  archive: { label: 'Archivage',    icon: Archive,     cls: 'text-orange-700 bg-orange-50' },
};

const ENTITY_LABELS: Record<string, string> = {
  supplier:       'Fournisseur',
  assessment:     'Évaluation',
  alert:          'Alerte',
  alert_rule:     'Règle d\'alerte',
  document:       'Document',
  organization:   'Organisation',
  org_member:     'Membre',
};

// ─── Diff viewer ─────────────────────────────────────────────────────────────

function DiffViewer({ changes }: { changes: Record<string, unknown> | null }) {
  if (!changes) return <p className="text-sm text-gray-400">Aucun détail disponible.</p>;

  const before = changes.before as Record<string, unknown> | undefined;
  const after  = changes.after  as Record<string, unknown> | undefined;

  if (!before && !after) {
    return (
      <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-auto max-h-64 text-gray-700 dark:text-gray-300">
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  }

  // Trouver les clés modifiées
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  const changedKeys = [...allKeys].filter(
    (k) => JSON.stringify((before ?? {})[k]) !== JSON.stringify((after ?? {})[k]),
  );

  if (changedKeys.length === 0) {
    return <p className="text-sm text-gray-400">Aucun changement détecté.</p>;
  }

  return (
    <div className="space-y-2">
      {changedKeys.map((key) => {
        const prevVal = (before ?? {})[key];
        const nextVal = (after ?? {})[key];
        const isDeletion = nextVal === undefined;
        const isAddition = prevVal === undefined;

        return (
          <div key={key} className="rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-1 font-mono font-medium text-gray-600 dark:text-gray-400">
              {key}
            </div>
            {!isAddition && (
              <div className="bg-red-50 dark:bg-red-950/20 px-3 py-1.5 font-mono text-red-700 dark:text-red-400 line-through opacity-70">
                {String(prevVal ?? '—')}
              </div>
            )}
            {!isDeletion && (
              <div className="bg-green-50 dark:bg-green-950/20 px-3 py-1.5 font-mono text-green-700 dark:text-green-400">
                {String(nextVal ?? '—')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Dialog détail entrée ─────────────────────────────────────────────────────

function EntryDetailDialog({
  entry,
  open,
  onClose,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;
  const cfg = ACTION_CFG[entry.action] ?? ACTION_CFG.view;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`rounded-md p-1.5 ${cfg.cls}`}>
              <cfg.icon className="h-4 w-4" />
            </span>
            Détail de l'entrée
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Action</p>
              <p className="font-medium">{cfg.label}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Entité</p>
              <p className="font-medium">
                {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                {entry.entity_name && ` — ${entry.entity_name}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-medium">
                {new Date(entry.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">IP</p>
              <p className="font-mono text-xs">{entry.ip_address ?? '—'}</p>
            </div>
          </div>

          {entry.changes && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Modifications</p>
              <DiffViewer changes={entry.changes} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageCount: number;
  filters: AuditFilters;
}

export function AuditLogTable({ entries, total, page, pageCount, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === 'all') params.delete(key);
      else params.set(key, value);
      if (key !== 'page') params.delete('page');
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [searchParams, pathname, router],
  );

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.action ?? 'all'} onValueChange={(v) => updateParam('action', v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes les actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {(Object.keys(ACTION_CFG) as AuditAction[]).map((a) => (
              <SelectItem key={a} value={a}>{ACTION_CFG[a].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.entity_type ?? 'all'} onValueChange={(v) => updateParam('entity_type', v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes les entités" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.action || filters.entity_type) && (
          <Button variant="ghost" size="sm" onClick={() => {
            startTransition(() => router.push(pathname));
          }}>
            <X className="mr-1 h-3.5 w-3.5" />Effacer
          </Button>
        )}

        <span className="ml-auto text-sm text-gray-500">{total} entrée{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className={`rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSearch className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aucune entrée dans le journal</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-800">
                <TableHead className="text-xs font-medium text-gray-500 w-32">Date</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 w-28">Action</TableHead>
                <TableHead className="text-xs font-medium text-gray-500">Entité</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 hidden md:table-cell">Utilisateur</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 hidden lg:table-cell w-24">IP</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {entries.map((entry) => {
                const cfg = ACTION_CFG[entry.action] ?? ACTION_CFG.view;
                return (
                  <TableRow
                    key={entry.id}
                    className="border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <TableCell className="py-3">
                      <p className="text-xs text-gray-500 tabular-nums">
                        {new Date(entry.created_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </TableCell>

                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </TableCell>

                    <TableCell>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                      </p>
                      {entry.entity_name && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{entry.entity_name}</p>
                      )}
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <p className="text-xs font-mono text-gray-400 truncate max-w-[120px]">
                        {entry.user_id ? entry.user_id.slice(0, 8) + '…' : '—'}
                      </p>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      <p className="text-xs font-mono text-gray-400">{entry.ip_address ?? '—'}</p>
                    </TableCell>

                    <TableCell>
                      {entry.changes && (
                        <Eye className="h-3.5 w-3.5 text-gray-300" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} sur {pageCount}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isPending}
              onClick={() => updateParam('page', String(page - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" />Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount || isPending}
              onClick={() => updateParam('page', String(page + 1))}>
              Suivant<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog détail */}
      <EntryDetailDialog
        entry={selectedEntry}
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
