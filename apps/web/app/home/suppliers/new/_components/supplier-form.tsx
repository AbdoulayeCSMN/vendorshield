'use client';

import { useActionState } from 'react';

import Link from 'next/link';

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
import {
  CATEGORY_LABELS,
  CRITICALITY_LABELS,
  STATUS_LABELS,
  type SupplierCategory,
  type SupplierCriticality,
  type SupplierStatus,
} from '~/lib/vendorshield/types';

// ─── Pays les plus courants ───────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'ES', name: 'Espagne' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'PL', name: 'Pologne' },
  { code: 'CN', name: 'Chine' },
  { code: 'IN', name: 'Inde' },
  { code: 'US', name: 'États-Unis' },
  { code: 'TR', name: 'Turquie' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'TH', name: 'Thaïlande' },
  { code: 'MA', name: 'Maroc' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'RU', name: 'Russie' },
  { code: 'BR', name: 'Brésil' },
  { code: 'MX', name: 'Mexique' },
];

// ─── État du formulaire ───────────────────────────────────────────────────────

type FormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

// ─── Composant formulaire ─────────────────────────────────────────────────────

export function SupplierForm() {
  const [state, formAction, isPending] = useActionState(
    createSupplierAction,
    null,
  );

  const fieldError = (field: string): string | undefined =>
    state && !state.success ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {/* ── Erreur globale ── */}
      {state && !state.success && state.error && !state.fieldErrors && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* ── Identité ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité</CardTitle>
          <CardDescription>
            Informations d'identification du fournisseur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Nom commercial"
              name="name"
              required
              placeholder="Ex: TechComp GmbH"
              error={fieldError('name')}
            />
            <FormField
              label="Raison sociale"
              name="legal_name"
              placeholder="Ex: TechComp GmbH & Co. KG"
              error={fieldError('legal_name')}
            />
            <FormField
              label="N° d'enregistrement"
              name="registration_number"
              placeholder="Ex: HRB 12345"
              error={fieldError('registration_number')}
            />
            <FormField
              label="N° TVA"
              name="vat_number"
              placeholder="Ex: DE123456789"
              error={fieldError('vat_number')}
            />
            <div className="sm:col-span-2">
              <FormField
                label="Site web"
                name="website"
                type="url"
                placeholder="https://..."
                error={fieldError('website')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Décrivez brièvement l'activité et le rôle de ce fournisseur..."
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Classification ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification</CardTitle>
          <CardDescription>
            Catégorie, statut et niveau de criticité pour votre portefeuille.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Catégorie */}
            <div>
              <Label htmlFor="category" className="text-sm font-medium">
                Catégorie <span className="text-red-500">*</span>
              </Label>
              <Select name="category" defaultValue="other" required>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as SupplierCategory[]).map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {fieldError('category') && (
                <p className="mt-1 text-xs text-red-600">{fieldError('category')}</p>
              )}
            </div>

            {/* Statut */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                Statut
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
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criticité */}
            <div>
              <Label htmlFor="criticality" className="text-sm font-medium">
                Criticité
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
                      {CRITICALITY_LABELS[c]}
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
                Fournisseur unique (sole source)
              </label>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                Ce fournisseur est le seul disponible pour ce besoin. Active
                une surveillance renforcée.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Localisation ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Localisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Pays */}
            <div>
              <Label htmlFor="country_code" className="text-sm font-medium">
                Pays
              </Label>
              <Select name="country_code">
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{countryFlag(c.code)}</span>
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Hidden input pour country_name — sera synchronisé côté client si besoin */}
              <input type="hidden" name="country_name" id="country_name_hidden" />
            </div>

            <FormField
              label="Ville"
              name="city"
              placeholder="Ex: Berlin"
              error={fieldError('city')}
            />

            <div className="sm:col-span-2">
              <FormField
                label="Adresse"
                name="address"
                placeholder="Ex: Hauptstraße 1, 10115"
                error={fieldError('address')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Relation commerciale ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relation commerciale</CardTitle>
          <CardDescription>Données financières et contractuelles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Dépense annuelle (€)"
              name="annual_spend_eur"
              type="number"
              placeholder="Ex: 500000"
              error={fieldError('annual_spend_eur')}
            />
            <FormField
              label="Part des achats (%)"
              name="spend_percentage"
              type="number"
              placeholder="Ex: 12.5"
              error={fieldError('spend_percentage')}
            />
            <FormField
              label="Délai de paiement (jours)"
              name="payment_terms_days"
              type="number"
              placeholder="Ex: 30"
              error={fieldError('payment_terms_days')}
            />
            <FormField
              label="CA annuel fournisseur (€)"
              name="annual_revenue_eur"
              type="number"
              placeholder="Ex: 10000000"
              error={fieldError('annual_revenue_eur')}
            />
            <FormField
              label="Effectif"
              name="employee_count"
              type="number"
              placeholder="Ex: 250"
              error={fieldError('employee_count')}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Notes ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes internes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            placeholder="Informations complémentaires, historique de la relation, points d'attention..."
            className="resize-none"
            rows={4}
          />
        </CardContent>
      </Card>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" asChild disabled={isPending}>
          <Link href="/home/suppliers">Annuler</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Créer le fournisseur'}
        </Button>
      </div>
    </form>
  );
}

// ─── Composant champ générique ────────────────────────────────────────────────

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

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}
