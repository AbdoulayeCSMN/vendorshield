'use client';

import { useState, useTransition } from 'react';

import {
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Textarea } from '@kit/ui/textarea';
import { useTranslation } from 'react-i18next';

import {
  createAlertRuleAction,
  deleteAlertRuleAction,
  toggleAlertRuleAction,
} from '~/lib/vendorshield/actions/alert.actions';
import {
  type AlertRule,
  type AlertSeverity,
  type RiskDimension,
  type SupplierCategory,
  type SupplierCriticality,
} from '~/lib/vendorshield/types';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';

// ─── Composant règle ──────────────────────────────────────────────────────────

function RuleCard({ rule }: { rule: AlertRule }) {
  const { t } = useTranslation('vendorshield');
  const { categoryLabels, criticalityLabels, dimensionLabels } = useEnumLabels();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (active: boolean) => {
    startTransition(async () => {
      await toggleAlertRuleAction(rule.id, active);
    });
  };

  const handleDelete = () => {
    if (!confirm(t('alerts.rules.confirmDelete'))) return;
    startTransition(async () => {
      await deleteAlertRuleAction(rule.id);
    });
  };

  const severityColors: Record<AlertSeverity, string> = {
    info:     'text-blue-700 bg-blue-50 border-blue-200',
    warning:  'text-orange-700 bg-orange-50 border-orange-200',
    critical: 'text-red-700 bg-red-50 border-red-200',
  };

  const severityLabels: Record<AlertSeverity, string> = {
    info: t('alerts.rules.severityInfo'),
    warning: t('alerts.rules.severityWarning'),
    critical: t('alerts.rules.severityCritical'),
  };

  const dimensionLabel = rule.dimension
    ? dimensionLabels[rule.dimension as RiskDimension]
    : t('alerts.rules.fieldGlobal');

  const conditionText = `${dimensionLabel} ${rule.operator} ${rule.threshold}`;

  return (
    <div className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
      rule.is_active
        ? 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60'
    }`}>
      {/* Toggle actif/inactif */}
      <Switch
        checked={rule.is_active}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="mt-0.5"
      />

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-white">{rule.name}</p>
            {rule.description && (
              <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${severityColors[rule.severity as AlertSeverity] ?? severityColors.warning}`}>
            {severityLabels[rule.severity as AlertSeverity] ?? rule.severity}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
            {conditionText}
          </span>
          {rule.applies_to_category && (
            <span className="text-xs text-gray-400">
              · {t('suppliers.hCategory')} : {categoryLabels[rule.applies_to_category as SupplierCategory]}
            </span>
          )}
          {rule.applies_to_criticality && (
            <span className="text-xs text-gray-400">
              · {t('suppliers.hCriticality')} : {criticalityLabels[rule.applies_to_criticality as SupplierCriticality]}
            </span>
          )}
          {rule.notify_email && (
            <span className="text-xs text-gray-400">· {t('alerts.rules.emailActive')}</span>
          )}
        </div>
      </div>

      {/* Supprimer */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-400 hover:text-red-600 shrink-0"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Dialog création règle ────────────────────────────────────────────────────

function CreateRuleDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('vendorshield');
  const { categoryLabels, criticalityLabels, dimensionLabels } = useEnumLabels();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('is_active', 'true');
    startTransition(async () => {
      const result = await createAlertRuleAction(fd);
      if (!result.success) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('alerts.rules.newTitle')}</DialogTitle>
          <DialogDescription>
            {t('alerts.rules.newDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-sm font-medium">{t('alerts.rules.labelName')} <span className="text-red-500">*</span></Label>
              <Input name="name" required placeholder={t('alerts.rules.namePlaceholder')} className="mt-1.5" />
            </div>

            {/* Dimension */}
            <div>
              <Label className="text-sm font-medium">{t('alerts.rules.labelDimension')}</Label>
              <Select name="dimension" defaultValue="">
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('alerts.rules.fieldGlobal')} />
                </SelectTrigger>
                <SelectContent>
                  {(['financial', 'operational', 'geopolitical', 'esg'] as RiskDimension[]).map((d) => (
                    <SelectItem key={d} value={d}>{dimensionLabels[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opérateur */}
            <div>
              <Label className="text-sm font-medium">{t('alerts.rules.labelOperator')}</Label>
              <Select name="operator" defaultValue="<">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<">{t('alerts.rules.opLt')}</SelectItem>
                  <SelectItem value="<=">{t('alerts.rules.opLte')}</SelectItem>
                  <SelectItem value=">">{t('alerts.rules.opGt')}</SelectItem>
                  <SelectItem value=">=">{t('alerts.rules.opGte')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seuil */}
            <div>
              <Label className="text-sm font-medium">{t('alerts.rules.labelThreshold')} <span className="text-red-500">*</span></Label>
              <Input name="threshold" type="number" min={0} max={100} required placeholder="40" className="mt-1.5" />
            </div>

            {/* Sévérité */}
            <div>
              <Label className="text-sm font-medium">{t('alerts.rules.labelSeverity')}</Label>
              <Select name="severity" defaultValue="warning">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t('alerts.rules.severityInfo')}</SelectItem>
                  <SelectItem value="warning">{t('alerts.rules.severityWarning')}</SelectItem>
                  <SelectItem value="critical">{t('alerts.rules.severityCritical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Catégorie */}
            <div>
              <Label className="text-sm font-medium">{t('alerts.rules.labelCategory')}</Label>
              <Select name="applies_to_category" defaultValue="">
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('alerts.rules.filterAll')} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryLabels) as SupplierCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criticité */}
            <div>
              <Label className="text-sm font-medium">{t('alerts.rules.labelCriticality')}</Label>
              <Select name="applies_to_criticality" defaultValue="">
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('alerts.rules.filterAll')} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(criticalityLabels) as SupplierCriticality[]).map((c) => (
                    <SelectItem key={c} value={c}>{criticalityLabels[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-sm font-medium">{t('alerts.rules.labelDescription')}</Label>
              <Textarea name="description" placeholder={t('alerts.rules.descPlaceholder')} className="mt-1.5 resize-none" rows={2} />
            </div>

            {/* Notify email */}
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="notify_email" name="notify_email" value="true" defaultChecked className="h-4 w-4 rounded border-gray-300 accent-primary" />
              <label htmlFor="notify_email" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                {t('alerts.rules.labelNotifyEmail')}
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isPending}>{t('alerts.rules.create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AlertRulesManager({ rules }: { rules: AlertRule[] }) {
  const { t } = useTranslation('vendorshield');
  const [showCreate, setShowCreate] = useState(false);

  const activeRules = rules.filter((r) => r.is_active);
  const inactiveRules = rules.filter((r) => !r.is_active);

  return (
    <div className="space-y-6">
      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('alerts.rules.title')}</CardTitle>
          <CardDescription>
            {t('alerts.rules.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm text-gray-500">
              <span>{t('alerts.rules.activeCount', { count: activeRules.length })}</span>
              {inactiveRules.length > 0 && (
                <span>{t('alerts.rules.inactiveCount', { count: inactiveRules.length })}</span>
              )}
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('alerts.rules.newRule')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Règles */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('alerts.rules.emptyTitle')}</p>
          <p className="mt-1 text-xs text-gray-400">{t('alerts.rules.emptyDesc')}</p>
          <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />{t('alerts.rules.emptyCreate')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}

      <CreateRuleDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
