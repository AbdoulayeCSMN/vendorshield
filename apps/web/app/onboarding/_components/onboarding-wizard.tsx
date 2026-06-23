'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Building2,
  Check,
  ChevronRight,
  Globe,
  Shield,
  Users,
} from 'lucide-react';

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

import { BrandMark } from '~/components/brand-mark';
import { createOrganizationAction } from '~/lib/vendorshield/actions/organization.actions';

// ─── Constantes ───────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Automobile',       'Aérospatial',      'Agroalimentaire',
  'Chimie',           'Construction',     'Énergie',
  'Électronique',     'Logistique',       'Luxe',
  'Pharmacie',        'Retail',           'Services',
  'Technologie',      'Textile',          'Autre',
];

const COMPANY_SIZES = [
  { value: '1-10',       label: '1–10 employés' },
  { value: '11-50',      label: '11–50 employés' },
  { value: '51-200',     label: '51–200 employés' },
  { value: '201-1000',   label: '201–1 000 employés' },
  { value: '1001-5000',  label: '1 001–5 000 employés' },
  { value: '5000+',      label: '5 000+ employés' },
];

const COUNTRIES = [
  { code: 'FR', name: 'France' },      { code: 'DE', name: 'Allemagne' },
  { code: 'GB', name: 'Royaume-Uni' }, { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },      { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' },      { code: 'NL', name: 'Pays-Bas' },
  { code: 'US', name: 'États-Unis' },  { code: 'CA', name: 'Canada' },
  { code: 'MA', name: 'Maroc' },       { code: 'TN', name: 'Tunisie' },
  { code: 'SN', name: 'Sénégal' },     { code: 'CI', name: "Côte d'Ivoire" },
];

// ─── Étapes ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'identity',  label: 'Identité',    icon: Building2 },
  { id: 'context',   label: 'Contexte',    icon: Globe },
  { id: 'confirm',   label: 'Confirmation', icon: Check },
];

type FormState = { error?: string } | null;

// ─── Composant principal ──────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    name:         '',
    industry:     '',
    company_size: '',
    country_code: '',
    website:      '',
    description:  '',
  });

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createOrganizationAction as (state: FormState, fd: FormData) => Promise<FormState>,
    null,
  );

  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const canNext = step === 0 ? values.name.trim().length >= 2 : true;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <BrandMark className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Vendor<span className="text-primary">Shield</span>
          </span>
        </div>

        {/* Steps */}
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
          {/* Step 0 — Identité */}
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Créez votre organisation</CardTitle>
                <CardDescription>
                  VendorShield est conçu pour les équipes. Commencez par nommer votre organisation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    Nom de l'organisation <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Ex: Groupe Dupont Achats"
                    value={values.name}
                    onChange={(e) => set('name', e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Ce nom sera visible par tous vos collaborateurs.
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Secteur d'activité</Label>
                  <Select value={values.industry} onValueChange={(v) => set('industry', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Choisir votre secteur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Taille de l'entreprise</Label>
                  <Select value={values.company_size} onValueChange={(v) => set('company_size', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setStep(1)}
                  disabled={!canNext}
                >
                  Continuer
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Step 1 — Contexte */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Localisation & web</CardTitle>
                <CardDescription>
                  Ces informations enrichissent vos rapports et analyses de risque.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Pays du siège</Label>
                  <Select value={values.country_code} onValueChange={(v) => set('country_code', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Sélectionner un pays..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {countryFlag(c.code)} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Site web</Label>
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
                    Retour
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(2)}>
                    Continuer
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2 — Confirmation */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Tout est prêt !</CardTitle>
                <CardDescription>
                  Vérifiez les informations avant de créer votre espace VendorShield.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Récap */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Organisation</span>
                    <span className="font-medium text-gray-900 dark:text-white">{values.name}</span>
                  </div>
                  {values.industry && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Secteur</span>
                      <span className="text-gray-700 dark:text-gray-300">{values.industry}</span>
                    </div>
                  )}
                  {values.company_size && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Taille</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {COMPANY_SIZES.find(s => s.value === values.company_size)?.label}
                      </span>
                    </div>
                  )}
                  {values.country_code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Pays</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {countryFlag(values.country_code)}{' '}
                        {COUNTRIES.find(c => c.code === values.country_code)?.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Votre rôle</span>
                    <span className="font-medium text-primary">Propriétaire</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Plan</span>
                    <span className="text-gray-700 dark:text-gray-300">Starter (25 fournisseurs)</span>
                  </div>
                </div>

                {/* Avantages */}
                <div className="space-y-2">
                  {[
                    'Accès à tous les modules VendorShield',
                    'Invitez jusqu\'à 1 collaborateur (Starter)',
                    'Score de fiabilité sur 24 critères',
                    'Alertes automatiques configurables',
                  ].map((benefit) => (
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
                    {isPending ? 'Création en cours...' : '🚀 Créer mon organisation'}
                  </Button>
                </form>

                <Button variant="ghost" className="w-full" onClick={() => setStep(1)} disabled={isPending}>
                  Retour
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          Vous pourrez inviter votre équipe depuis les paramètres.
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
