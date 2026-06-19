'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { ListChecks, Plus, Trash2 } from 'lucide-react';
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
  createActionAction,
  deleteActionAction,
  updateActionStatusAction,
} from '~/lib/vendorshield/actions/workflow.actions';
import { type CorrectiveAction } from '~/lib/vendorshield/workflow';

const PRIORITY_CLS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-700',
};

const STATUS_CLS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

const NEXT_STATUS: Record<string, string> = { open: 'in_progress', in_progress: 'done', done: 'open' };

export function SupplierCapaPanel({
  supplierId,
  actions,
}: {
  supplierId: string;
  actions: CorrectiveAction[];
}) {
  const { t } = useTranslation('vendorshield');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', owner: '', due_date: '' });

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
      const res = await createActionAction({ supplier_id: supplierId, ...form });
      if (res.success) {
        setForm({ title: '', priority: 'medium', owner: '', due_date: '' });
        setAdding(false);
        toast.success(t('capa.created'));
      }
      return res;
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="text-primary h-4 w-4" />
          {t('capa.title')}
        </CardTitle>
        <CardDescription className="text-xs">{t('capa.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length > 0 ? (
          <ul className="space-y-2">
            {actions.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  <div className="text-muted-foreground text-[11px]">
                    {a.owner ? `${a.owner}` : t('capa.unassigned')}
                    {a.due_date ? ` · ${t('capa.due', { date: a.due_date })}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge className={PRIORITY_CLS[a.priority]}>{t(`capa.priority.${a.priority}`)}</Badge>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => updateActionStatusAction(a.id, supplierId, NEXT_STATUS[a.status] ?? 'open'))}
                    title={t('capa.changeStatus')}
                  >
                    <Badge className={`${STATUS_CLS[a.status]} cursor-pointer`}>
                      {t(`capa.status.${a.status}`)}
                    </Badge>
                  </button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => run(() => deleteActionAction(a.id, supplierId))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t('capa.empty')}</p>
        )}

        {adding ? (
          <div className="space-y-2 rounded-lg border p-3">
            <Input className="h-8" placeholder={t('capa.titlePlaceholder')} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">{t('capa.priorityHigh')}</SelectItem>
                  <SelectItem value="medium">{t('capa.priorityMedium')}</SelectItem>
                  <SelectItem value="low">{t('capa.priorityLow')}</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="h-8" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <Input className="h-8" placeholder={t('capa.owner')} value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={isPending} onClick={submit}>{t('common.save')}</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> {t('capa.new')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
