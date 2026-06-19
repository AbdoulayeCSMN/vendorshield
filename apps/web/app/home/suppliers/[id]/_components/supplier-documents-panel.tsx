'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Check, FileText, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  addSupplierDocumentAction,
  deleteSupplierDocumentAction,
} from '~/lib/vendorshield/actions/document.actions';
import { type ComplianceSummary, DOC_TYPES } from '~/lib/vendorshield/documents';

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  DOC_TYPES.map((t) => [t.value, t.label]),
);

const STATUS_META: Record<string, { label: string; cls: string }> = {
  valid: { label: 'Valide', cls: 'bg-green-100 text-green-800' },
  expiring: { label: 'Expire bientôt', cls: 'bg-amber-100 text-amber-800' },
  expired: { label: 'Expiré', cls: 'bg-red-100 text-red-800' },
  no_expiry: { label: 'Sans expiration', cls: 'bg-gray-100 text-gray-700' },
};

export function SupplierDocumentsPanel({
  supplierId,
  compliance,
}: {
  supplierId: string;
  compliance: ComplianceSummary;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    doc_type: '',
    name: '',
    issuer: '',
    reference: '',
    issued_date: '',
    expiry_date: '',
    file_url: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.doc_type || !form.name.trim()) {
      toast.error('Type et nom requis');
      return;
    }
    startTransition(async () => {
      const res = await addSupplierDocumentAction({ supplier_id: supplierId, ...form });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Document ajouté');
      setForm({ doc_type: '', name: '', issuer: '', reference: '', issued_date: '', expiry_date: '', file_url: '' });
      setAdding(false);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteSupplierDocumentAction(id, supplierId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Document supprimé');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="text-primary h-4 w-4" />
            Conformité & documents
          </CardTitle>
          <Badge
            className={
              compliance.coverage >= 100
                ? 'bg-green-100 text-green-800'
                : compliance.coverage >= 50
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800'
            }
          >
            {compliance.coverage}% conforme
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Devoir de vigilance / CSRD ·{' '}
          {compliance.expired_count > 0 && (
            <span className="text-red-600">{compliance.expired_count} expiré(s) · </span>
          )}
          {compliance.expiring_count > 0 && (
            <span className="text-amber-600">{compliance.expiring_count} à renouveler</span>
          )}
          {compliance.expired_count === 0 && compliance.expiring_count === 0 && 'à jour'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Checklist conformité */}
        <div className="flex flex-wrap gap-2">
          {compliance.required.map((r) => (
            <span
              key={r.doc_type}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                r.present ? 'border-green-200 text-green-700' : 'border-red-200 text-red-600'
              }`}
            >
              {r.present ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {TYPE_LABEL[r.doc_type]}
            </span>
          ))}
        </div>

        {/* Liste des documents */}
        {compliance.documents.length > 0 ? (
          <ul className="space-y-2">
            {compliance.documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{d.name}</span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {TYPE_LABEL[d.doc_type] ?? d.doc_type}
                    {d.issuer ? ` · ${d.issuer}` : ''}
                    {d.expiry_date ? ` · exp. ${d.expiry_date}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge className={STATUS_META[d.status]?.cls}>{STATUS_META[d.status]?.label}</Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={isPending}
                    onClick={() => remove(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun document enregistré.</p>
        )}

        {/* Formulaire d'ajout */}
        {adding ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Type</Label>
                <Select value={form.doc_type} onValueChange={(v) => set('doc_type', v)}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue placeholder="Type de document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Nom</Label>
                <Input className="mt-1 h-8" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Certificat ISO 9001 2024" />
              </div>
              <div>
                <Label className="text-xs">Émetteur</Label>
                <Input className="mt-1 h-8" value={form.issuer} onChange={(e) => set('issuer', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Référence</Label>
                <Input className="mt-1 h-8" value={form.reference} onChange={(e) => set('reference', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Émis le</Label>
                <Input type="date" className="mt-1 h-8" value={form.issued_date} onChange={(e) => set('issued_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Expire le</Label>
                <Input type="date" className="mt-1 h-8" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Lien (URL)</Label>
                <Input className="mt-1 h-8" value={form.file_url} onChange={(e) => set('file_url', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={isPending} onClick={submit}>
                {isPending ? 'Ajout...' : 'Enregistrer'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={isPending}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter un document
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
