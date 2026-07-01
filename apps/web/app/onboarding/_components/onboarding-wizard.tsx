'use client';

import { useActionState, useMemo, useState } from 'react';

import {
  Building2,
  Check,
  ChevronRight,
  Globe,
} from 'lucide-react';
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

import { BrandMark } from '~/components/brand-mark';
import { createOrganizationAction } from '~/lib/vendorshield/actions/organization.actions';

const COUNTRY_CODES = ['FR', 'DE', 'GB', 'BE', 'CH', 'ES', 'IT', 'NL', 'US', 'CA', 'MA', 'TN', 'SN', 'CI'];

const INDUSTRY_KEYS = [
  'ind_automotive', 'ind_aerospace', 'ind_food', 'ind_chemical',
  'ind_construction', 'ind_energy', 'ind_electronics', 'ind_logistics',
  'ind_luxury', 'ind_pharma', 'ind_retail', 'ind_services',
  'ind_tech', 'ind_textile', 'ind_other',
] as const;

const SIZE_KEYS = [
  { value: '1-10',       key: 'size_1_10' },
  { value: '11-50',      key: 'size_11_50' },
  { value: '51-200',     key: 'size_51_200' },
  { value: '201-1000',   key: 'size_201_1000' },
  { value: '1001-5000',  key: 'size_1001_5000' },
  { value: '5000+',      key: 'size_5000plus' },
] as const;

type FormState = { error?: string } | null;

export function OnboardingWizard() {
  const { t, i18n } = useTranslation('vendorshield');
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    name:         '',
    industry:     '',
    company_size: '',
    country_code: '',
    website:      '',
  });

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createOrganizationAction as (state: FormState, fd: FormData) => Promise<FormState>,
    null,
  );

  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const canNext = step === 0 ? values.name.trim().length >= 2 : true;

  const countryNames = useMemo(() => {
    try {
      const fmt = new Intl.DisplayNames([i18n.language], { type: 'region' });
      return Object.fromEntries(COUNTRY_CODES.map((code) => [code, fmt.of(code) ?? code]));
    } catch {
      return Object.fromEntries(COUNTRY_CODES.map((code) => [code, code]));
    }
  }, [i18n.language]);

  const STEPS = [
    { id: 'identity', label: t('onboarding.stepIdentity'), icon: Building2 },
    { id: 'context',  label: t('onboarding.stepContext'),  icon: Globe },
    { id: 'confirm',  label: t('onboarding.stepConfirm'),  icon: Check },
  ];

  const BENEFITS = [
    t('onboarding.benefit0'), t('onboarding.benefit1'),
    t('onboarding.benefit2'), t('onboarding.benefit3'),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        <div className="flex items-center gap-2 justify-center mb-8">
          <BrandMark className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Avilyre
          </span>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive   = i === step;
            const isComplete = i < step;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 flex-1 ${i > 0 ? 'justify-center' : ''}`}>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    isComplete ? 'bg-primary text-white'
                    : isActive  ? 'bg-primary/10 text-primary border-2 border-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 ${isComplete ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">{t('onboarding.step0Title')}</CardTitle>
                <CardDescription>{t('onboarding.step0Desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t('onboarding.labelOrgName')}</Label>
                  <Input
                    className="mt-1.5"
                    placeholder={t('onboarding.orgNamePlaceholder')}
                    value={values.name}
                    onChange={(e) => set('name', e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('onboarding.orgNameHint')}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">{t('onboarding.labelSector')}</Label>
                  <Select value={values.industry} onValueChange={(v) => set('industry', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={t('onboarding.sectorPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>{t(`onboarding.${key}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">{t('onboarding.labelSize')}</Label>
                  <Select value={values.company_size} onValueChange={(v) => set('company_size', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={t('onboarding.sizePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_KEYS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{t(`onboarding.${s.key}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={() => setStep(1)} disabled={!canNext}>
                  {t('onboarding.continue')}
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">{t('onboarding.step1Title')}</CardTitle>
                <CardDescription>{t('onboarding.step1Desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t('onboarding.labelHQ')}</Label>
                  <Select value={values.country_code} onValueChange={(v) => set('country_code', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={t('onboarding.countryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {countryFlag(code)} {countryNames[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">{t('onboarding.labelWebsite')}</Label>
                  <Input
                    className="mt-1.5"
                    type="url"
                    placeholder="https://..."
                    value={values.website}
                    onChange={(e) => set('website', e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    {t('onboarding.back')}
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(2)}>
                    {t('onboarding.continue')}
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">{t('onboarding.step2Title')}</CardTitle>
                <CardDescription>{t('onboarding.step2Desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('onboarding.recapOrg')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{values.name}</span>
                  </div>
                  {values.industry && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('onboarding.recapSector')}</span>
                      <span className="text-gray-700 dark:text-gray-300">{t(`onboarding.${values.industry}`)}</span>
                    </div>
                  )}
                  {values.company_size && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('onboarding.recapSize')}</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t(`onboarding.${SIZE_KEYS.find((s) => s.value === values.company_size)?.key ?? ''}`)}
                      </span>
                    </div>
                  )}
                  {values.country_code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('onboarding.recapCountry')}</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {countryFlag(values.country_code)} {countryNames[values.country_code]}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('onboarding.recapRole')}</span>
                    <span className="font-medium text-primary">{t('onboarding.recapOwner')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('onboarding.recapPlan')}</span>
                    <span className="text-gray-700 dark:text-gray-300">{t('onboarding.recapPlanValue')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {BENEFITS.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>

                {state && (state as { error?: string }).error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {(state as { error?: string }).error}
                  </div>
                )}

                <form action={formAction} className="space-y-2">
                  <input type="hidden" name="name"         value={values.name} />
                  <input type="hidden" name="industry"     value={values.industry} />
                  <input type="hidden" name="company_size" value={values.company_size} />
                  <input type="hidden" name="country_code" value={values.country_code} />
                  <input type="hidden" name="website"      value={values.website} />

                  <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                    {isPending ? t('onboarding.creating') : t('onboarding.createCta')}
                  </Button>
                </form>

                <Button variant="ghost" className="w-full" onClick={() => setStep(1)} disabled={isPending}>
                  {t('onboarding.back')}
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          {t('onboarding.teamHint')}
        </p>
      </div>
    </div>
  );
}

function countryFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join('');
}
