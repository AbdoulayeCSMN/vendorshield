'use client';

import { useActionState, useMemo } from 'react';

import Link from 'next/link';

import { useTranslation } from 'react-i18next';

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
import { Textarea } from '@kit/ui/textarea';

import { createSupplierAction } from '~/lib/vendorshield/actions/supplier.actions';
import { useEnumLabels } from '~/lib/vendorshield/use-labels';
import type {
  SupplierCategory,
  SupplierCriticality,
  SupplierStatus,
} from '~/lib/vendorshield/types';

const COUNTRY_CODES = [
  'FR','DE','IT','ES','GB','NL','BE','CH','PL',
  'CN','IN','US','TR','VN','TH','MA','TN','RU','BR','MX',
];

type FormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export function SupplierForm() {
  const { t, i18n } = useTranslation('vendorshield');
  const { categoryLabels, statusLabels, criticalityLabels } = useEnumLabels();

  const [state, formAction, isPending] = useActionState(
    createSupplierAction,
    null,
  );

  const countryNames = useMemo(() => {
    const dn = new Intl.DisplayNames([i18n.language], { type: 'region' });
    return COUNTRY_CODES.map((code) => ({ code, name: dn.of(code) ?? code }));
  }, [i18n.language]);

  const fieldError = (field: string): string | undefined =>
    state && !state.success ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.success && state.error && !state.fieldErrors && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('supplier.formIdentity')}</CardTitle>
          <CardDescription>{t('supplier.formIdentityDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('supplier.labelName')}
              name="name"
              required
              placeholder="Ex: TechComp GmbH"
              error={fieldError('name')}
            />
            <FormField
              label={t('supplier.labelLegalName')}
              name="legal_name"
              placeholder="Ex: TechComp GmbH & Co. KG"
              error={fieldError('legal_name')}
            />
            <FormField
              label={t('supplier.labelRegNum')}
              name="registration_number"
              placeholder="Ex: HRB 12345"
              error={fieldError('registration_number')}
            />
            <FormField
              label={t('supplier.labelVat')}
              name="vat_number"
              placeholder="Ex: DE123456789"
              error={fieldError('vat_number')}
            />
            <div className="sm:col-span-2">
              <FormField
                label={t('supplier.labelWebsite')}
                name="website"
                type="url"
                placeholder="https://..."
                error={fieldError('website')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              {t('supplier.labelDescription')}
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder={t('supplier.descPlaceholder')}
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('supplier.formClassification')}</CardTitle>
          <CardDescription>{t('supplier.formClassificationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Category */}
            <div>
              <Label htmlFor="category" className="text-sm font-medium">
                {t('supplier.labelCategory')} <span className="text-red-500">*</span>
              </Label>
              <Select name="category" defaultValue="other" required>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('supplier.choosePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryLabels) as SupplierCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError('category') && (
                <p className="mt-1 text-xs text-red-600">{fieldError('category')}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                {t('supplier.labelStatus')}
              </Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ['active', 'under_review', 'suspended', 'inactive'] as SupplierStatus[]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criticality */}
            <div>
              <Label htmlFor="criticality" className="text-sm font-medium">
                {t('supplier.labelCriticality')}
              </Label>
              <Select name="criticality" defaultValue="medium">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ['critical', 'high', 'medium', 'low'] as SupplierCriticality[]
                  ).map((c) => (
                    <SelectItem key={c} value={c}>
                      {criticalityLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sole source */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-100 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3">
            <input
              type="checkbox"
              id="is_sole_source"
              name="is_sole_source"
              value="true"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 cursor-pointer"
            />
            <div>
              <label
                htmlFor="is_sole_source"
                className="text-sm font-medium text-orange-800 dark:text-orange-300 cursor-pointer"
              >
                {t('supplier.isSoleSource')}
              </label>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                {t('supplier.isSoleSourceDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('supplier.formLocation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Country */}
            <div>
              <Label htmlFor="country_code" className="text-sm font-medium">
                {t('supplier.labelCountry')}
              </Label>
              <Select name="country_code">
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('supplier.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {countryNames.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{countryFlag(c.code)}</span>
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="country_name" id="country_name_hidden" />
            </div>

            <FormField
              label={t('supplier.labelCity')}
              name="city"
              placeholder="Ex: Berlin"
              error={fieldError('city')}
            />

            <div className="sm:col-span-2">
              <FormField
                label={t('supplier.labelAddress')}
                name="address"
                placeholder="Ex: Hauptstraße 1, 10115"
                error={fieldError('address')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commercial relationship */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('supplier.formCommercial')}</CardTitle>
          <CardDescription>{t('supplier.formCommercialDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('supplier.labelSpend')}
              name="annual_spend_eur"
              type="number"
              placeholder="Ex: 500000"
              error={fieldError('annual_spend_eur')}
            />
            <FormField
              label={t('supplier.labelSpendPct')}
              name="spend_percentage"
              type="number"
              placeholder="Ex: 12.5"
              error={fieldError('spend_percentage')}
            />
            <FormField
              label={t('supplier.labelPaymentTerms')}
              name="payment_terms_days"
              type="number"
              placeholder="Ex: 30"
              error={fieldError('payment_terms_days')}
            />
            <FormField
              label={t('supplier.labelRevenue')}
              name="annual_revenue_eur"
              type="number"
              placeholder="Ex: 10000000"
              error={fieldError('annual_revenue_eur')}
            />
            <FormField
              label={t('supplier.labelEmployees')}
              name="employee_count"
              type="number"
              placeholder="Ex: 250"
              error={fieldError('employee_count')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Internal notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('supplier.formNotes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            placeholder={t('supplier.notesPlaceholder')}
            className="resize-none"
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" asChild disabled={isPending}>
          <Link href="/home/suppliers">{t('supplier.cancel')}</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t('supplier.saving') : t('supplier.create')}
        </Button>
      </div>
    </form>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}{' '}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className={`mt-1.5 ${error ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}
