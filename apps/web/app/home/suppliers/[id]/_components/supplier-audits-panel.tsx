'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
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

const TYPE_LABEL: Record<string, string> = Object.fromEntries(AUDIT_TYPES.map((t) => [t.value, t.label]));

const STATUS_META: Record<string, { label: string; cls: string }> = {
  planned: { label: 'Planifié', cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'En cours', cls: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Terminé', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé', cls: 'bg-gray-100 text-gray-700' },
};

const RESULT_META: Record<string, { label: string; cls: string }> = {
  pass: { label: 'Conforme', cls: 'bg-green-100 text-green-800' },
  conditional: { label: 'Sous réserve', cls: 'bg-amber-100 text-amber-800' },
  fail: { label: 'Non conforme', cls: 'bg-red-100 text-red-800' },
};

export function SupplierAuditsPanel({
  supplierId,
  audits,
}: {
  supplierId: string;
  audits: SupplierAudit[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ audit_type: '', title: '', auditor: '', scheduled_date: '' });

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? 'Erreur');
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
        toast.success('Audit planifié');
      }
      return res;
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="text-primary h-4 w-4" />
          Audits
        </CardTitle>
        <CardDescription className="text-xs">Planifiez et suivez les audits fournisseur.</CardDescription>
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
                      {TYPE_LABEL[a.audit_type] ?? a.audit_type}
                      {a.scheduled_date ? ` · ${a.scheduled_date}` : ''}
                      {a.auditor ? ` · ${a.auditor}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge className={STATUS_META[a.status]?.cls}>{STATUS_META[a.status]?.label}</Badge>
                    {a.result && <Badge className={RESULT_META[a.result]?.cls}>{RESULT_META[a.result]?.label}</Badge>}
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => run(() => deleteAuditAction(a.id, supplierId))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {a.status === 'planned' && (
                    <Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" disabled={isPending} onClick={() => run(() => updateAuditAction({ id: a.id, supplier_id: supplierId, status: 'in_progress' }))}>
                      Démarrer
                    </Button>
                  )}
                  {a.status !== 'completed' && a.status !== 'cancelled' && (
                    <>
                      <Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" disabled={isPending} onClick={() => run(() => updateAuditAction({ id: a.id, supplier_id: supplierId, status: 'completed', result: 'pass' }))}>
                        Clôturer ✓ conforme
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" disabled={isPending} onClick={() => run(() => updateAuditAction({ id: a.id, supplier_id: supplierId, status: 'completed', result: 'fail' }))}>
                        ✗ non conforme
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun audit.</p>
        )}

        {adding ? (
          <div className="space-y-2 rounded-lg border p-3">
            <Select value={form.audit_type} onValueChange={(v) => setForm((f) => ({ ...f, audit_type: v }))}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Type d'audit..." /></SelectTrigger>
              <SelectContent>
                {AUDIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="h-8" placeholder="Intitulé" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8" placeholder="Auditeur" value={form.auditor} onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))} />
              <Input type="date" className="h-8" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={isPending} onClick={submit}>Enregistrer</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Planifier un audit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
