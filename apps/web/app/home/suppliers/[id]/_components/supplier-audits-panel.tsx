'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  createAuditAction,
  deleteAuditAction,
  updateAuditAction,
} from '~/lib/vendorshield/actions/workflow.actions';
import { AUDIT_TYPES, type SupplierAudit } from '~/lib/vendorshield/workflow';

const STATUS_CLS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

const RESULT_CLS: Record<string, string> = {
  pass: 'bg-green-100 text-green-800',
  conditional: 'bg-amber-100 text-amber-800',
  fail: 'bg-red-100 text-red-800',
};

export function SupplierAuditsPanel({
  supplierId,
  audits,
}: {
  supplierId: string;
  audits: SupplierAudit[];
}) {
  const { t } = useTranslation('vendorshield');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ audit_type: '', title: '', auditor: '', scheduled_date: '' });

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? t('common.error'));
        return;
      }
      router.refresh();
    });

  const submit = () =>
    run(async () => {
      const res = await createAuditAction({ supplier_id: supplierId, ...form });
      if (res.success) {
        setForm({ audit_type: '', title: '', auditor: '', scheduled_date: '' });
        setAdding(false);
        toast.success(t('audits.scheduled'));
      }
      return res;
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="text-primary h-4 w-4" />
          {t('audits.title')}
        </CardTitle>
        <CardDescription className="text-xs">{t('audits.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {audits.length > 0 ? (
          <ul className="space-y-2">
            {audits.map((a) => (
              <li key={a.id} className="rounded-lg border p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {t(`audits.type.${a.audit_type}`)}
                      {a.scheduled_date ? ` · ${a.scheduled_date}` : ''}
                      {a.auditor ? ` · ${a.auditor}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge className={STATUS_CLS[a.status]}>{t(`audits.status.${a.status}`)}</Badge>
                    {a.result && <Badge className={RESULT_CLS[a.result]}>{t(`audits.result.${a.result}`)}</Badge>}
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => run(() => deleteAuditAction(a.id, supplierId))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {a.status === 'planned' && (
                    <Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" disabled={isPending} onClick={() => run(() => updateAuditAction({ id: a.id, supplier_id: supplierId, status: 'in_progress' }))}>
                      {t('audits.start')}
                    </Button>
                  )}
                  {a.status !== 'completed' && a.status !== 'cancelled' && (
                    <>
                      <Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" disabled={isPending} onClick={() => run(() => updateAuditAction({ id: a.id, supplier_id: supplierId, status: 'completed', result: 'pass' }))}>
                        {t('audits.closePass')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" disabled={isPending} onClick={() => run(() => updateAuditAction({ id: a.id, supplier_id: supplierId, status: 'completed', result: 'fail' }))}>
                        {t('audits.closeFail')}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t('audits.empty')}</p>
        )}

        {adding ? (
          <div className="space-y-2 rounded-lg border p-3">
            <Select value={form.audit_type} onValueChange={(v) => setForm((f) => ({ ...f, audit_type: v }))}>
              <SelectTrigger className="h-8"><SelectValue placeholder={t('audits.typePlaceholder')} /></SelectTrigger>
              <SelectContent>
                {AUDIT_TYPES.map((at) => <SelectItem key={at.value} value={at.value}>{t(`audits.type.${at.value}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="h-8" placeholder={t('audits.titlePlaceholder')} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8" placeholder={t('audits.auditor')} value={form.auditor} onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))} />
              <Input type="date" className="h-8" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={isPending} onClick={submit}>{t('common.save')}</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> {t('audits.schedule')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
