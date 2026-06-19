'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Check, FileText, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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

const STATUS_CLS: Record<string, string> = {
  valid: 'bg-green-100 text-green-800',
  expiring: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
  no_expiry: 'bg-gray-100 text-gray-700',
};

export function SupplierDocumentsPanel({
  supplierId,
  compliance,
}: {
  supplierId: string;
  compliance: ComplianceSummary;
}) {
  const { t } = useTranslation('vendorshield');
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
      toast.error(t('documents.typeNameRequired'));
      return;
    }
    startTransition(async () => {
      const res = await addSupplierDocumentAction({ supplier_id: supplierId, ...form });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(t('documents.added'));
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
      toast.success(t('documents.removed'));
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="text-primary h-4 w-4" />
            {t('documents.title')}
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
            {t('documents.compliant', { pct: compliance.coverage })}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {t('documents.subtitle')} ·{' '}
          {compliance.expired_count > 0 && (
            <span className="text-red-600">{t('documents.expiredCount', { count: compliance.expired_count })} · </span>
          )}
          {compliance.expiring_count > 0 && (
            <span className="text-amber-600">{t('documents.expiringCount', { count: compliance.expiring_count })}</span>
          )}
          {compliance.expired_count === 0 && compliance.expiring_count === 0 && t('documents.upToDate')}
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
              {t(`documents.docType.${r.doc_type}`)}
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
                    {t(`documents.docType.${d.doc_type}`)}
                    {d.issuer ? ` · ${d.issuer}` : ''}
                    {d.expiry_date ? ` · ${t('documents.exp', { date: d.expiry_date })}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge className={STATUS_CLS[d.status]}>{t(`documents.status.${d.status}`)}</Badge>
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
          <p className="text-muted-foreground text-sm">{t('documents.empty')}</p>
        )}

        {/* Formulaire d'ajout */}
        {adding ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">{t('documents.type')}</Label>
                <Select value={form.doc_type} onValueChange={(v) => set('doc_type', v)}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue placeholder={t('documents.typePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {t(`documents.docType.${dt.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t('documents.name')}</Label>
                <Input className="mt-1 h-8" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('documents.namePlaceholder')} />
              </div>
              <div>
                <Label className="text-xs">{t('documents.issuer')}</Label>
                <Input className="mt-1 h-8" value={form.issuer} onChange={(e) => set('issuer', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t('documents.reference')}</Label>
                <Input className="mt-1 h-8" value={form.reference} onChange={(e) => set('reference', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t('documents.issuedOn')}</Label>
                <Input type="date" className="mt-1 h-8" value={form.issued_date} onChange={(e) => set('issued_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t('documents.expiresOn')}</Label>
                <Input type="date" className="mt-1 h-8" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t('documents.link')}</Label>
                <Input className="mt-1 h-8" value={form.file_url} onChange={(e) => set('file_url', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={isPending} onClick={submit}>
                {isPending ? t('documents.adding') : t('common.save')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={isPending}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> {t('documents.add')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
