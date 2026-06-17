'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Separator } from '@kit/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { updateSupplierStatusAction } from '~/lib/vendorshield/actions/supplier.actions';
import type { SupplierWithRelations } from '~/lib/vendorshield/suppliers.server';
import {
  ALERT_SEVERITY_COLORS,
  ALERT_SEVERITY_LABELS,
  ASSESSMENT_STATUS_LABELS,
  CATEGORY_LABELS,
  CRITICALITY_LABELS,
  DIMENSION_LABELS,
  RISK_LEVEL_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatEur,
  type AlertSeverity,
  type RiskDimension,
  type RiskLevel,
} from '~/lib/vendorshield/types';

// ─── Score card ───────────────────────────────────────────────────────────────

function DimensionScoreCard({
  dimension,
  score,
}: {
  dimension: RiskDimension;
  score: number | null;
}) {
  const cfg = {
    financial: {
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    operational: {
      icon: Zap,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    geopolitical: {
      icon: Globe,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    esg: {
      icon: Shield,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950',
    },
  } as const;

  const { icon: Icon, color, bg } = cfg[dimension];

  const barColor =
    score === null
      ? 'bg-gray-200'
      : score >= 70
        ? 'bg-green-500'
        : score >= 40
          ? 'bg-orange-500'
          : 'bg-red-500';

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`rounded-lg p-2 ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
          {score !== null ? score : '—'}
          {score !== null && (
            <span className="text-sm font-normal text-gray-400">/100</span>
          )}
        </span>
      </div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
        {DIMENSION_LABELS[dimension]}
      </p>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: score !== null ? `${score}%` : '0%' }}
        />
      </div>
    </div>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskLevelBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return null;
  const cfg = {
    low: {
      icon: ShieldCheck,
      cls: 'text-green-700 bg-green-50 border-green-200',
    },
    medium: {
      icon: AlertTriangle,
      cls: 'text-orange-700 bg-orange-50 border-orange-200',
    },
    high: {
      icon: ShieldAlert,
      cls: 'text-red-700 bg-red-50 border-red-200',
    },
    critical: {
      icon: ShieldAlert,
      cls: 'text-red-900 bg-red-100 border-red-300',
    },
  } as const;
  const { icon: Icon, cls } = cfg[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${cls}`}
    >
      <Icon className="h-4 w-4" />
      Risque {RISK_LEVEL_LABELS[level]}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SupplierDetail({
  supplier,
}: {
  supplier: SupplierWithRelations;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const openAlerts = supplier.alerts.filter((a) => a.status === 'open');
  const criticalAlerts = openAlerts.filter((a) => a.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar pays */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-3xl">
            {supplier.country_code
              ? countryFlag(supplier.country_code)
              : supplier.name.charAt(0)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {supplier.name}
              </h1>
              {supplier.is_sole_source && (
                <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Sole source
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[supplier.status]}`}
              >
                {STATUS_LABELS[supplier.status]}
              </span>
              <span className="text-xs text-gray-400">
                {CATEGORY_LABELS[supplier.category]}
              </span>
              {supplier.country_name && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {supplier.country_name}
                  {supplier.city && `, ${supplier.city}`}
                </span>
              )}
              <RiskLevelBadge level={supplier.risk_level} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/home/risk-assessments/new?supplier=${supplier.id}`}>
              <Shield className="mr-1.5 h-4 w-4" />
              Nouvelle évaluation
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/home/suppliers/${supplier.id}/edit`}>
              <Edit className="mr-1.5 h-4 w-4" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      {/* ── KPI alertes critiques ── */}
      {criticalAlerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {criticalAlerts.length} alerte
              {criticalAlerts.length > 1 ? 's critiques' : ' critique'} en cours
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              {criticalAlerts[0]?.title}
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="ml-auto shrink-0 border-red-200 text-red-700 hover:bg-red-100"
          >
            <Link href={`/home/alerts?supplier=${supplier.id}`}>
              Voir les alertes
            </Link>
          </Button>
        </div>
      )}

      {/* ── 4 scores dimensionnels ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(['financial', 'operational', 'geopolitical', 'esg'] as RiskDimension[]).map(
          (dim) => (
            <DimensionScoreCard
              key={dim}
              dimension={dim}
              score={supplier[`${dim}_score` as keyof SupplierWithRelations] as number | null}
            />
          ),
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="assessments">
            Évaluations
            {supplier.risk_assessments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium">
                {supplier.risk_assessments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alertes
            {openAlerts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px] font-medium">
                {openAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts
            {supplier.supplier_contacts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium">
                {supplier.supplier_contacts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Aperçu */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Informations générales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Raison sociale"
                  value={supplier.legal_name ?? supplier.name}
                />
                <InfoRow
                  label="N° d'enregistrement"
                  value={supplier.registration_number}
                />
                <InfoRow label="N° TVA" value={supplier.vat_number} />
                <InfoRow
                  label="Site web"
                  value={
                    supplier.website ? (
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {supplier.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null
                  }
                />
                <InfoRow
                  label="Criticité"
                  value={CRITICALITY_LABELS[supplier.criticality]}
                />
                <InfoRow
                  label="Première évaluation"
                  value={
                    supplier.last_assessment_date
                      ? formatDate(supplier.last_assessment_date)
                      : null
                  }
                />
                {supplier.description && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Description</dt>
                    <dd className="text-sm text-gray-700 dark:text-gray-300">
                      {supplier.description}
                    </dd>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations commerciales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Relation commerciale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Dépense annuelle"
                  value={formatEur(supplier.annual_spend_eur)}
                />
                <InfoRow
                  label="Part des achats"
                  value={
                    supplier.spend_percentage !== null
                      ? `${supplier.spend_percentage}%`
                      : null
                  }
                />
                <InfoRow
                  label="Délai de paiement"
                  value={
                    supplier.payment_terms_days
                      ? `${supplier.payment_terms_days} jours`
                      : null
                  }
                />
                <InfoRow
                  label="Début du contrat"
                  value={
                    supplier.contract_start_date
                      ? formatDate(supplier.contract_start_date)
                      : null
                  }
                />
                <InfoRow
                  label="Fin du contrat"
                  value={
                    supplier.contract_end_date
                      ? formatDate(supplier.contract_end_date)
                      : null
                  }
                />
                <InfoRow
                  label="Fournisseur unique"
                  value={supplier.is_sole_source ? 'Oui ⚠️' : 'Non'}
                />
              </CardContent>
            </Card>

            {/* Données financières */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Données financières
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="CA annuel"
                  value={formatEur(supplier.annual_revenue_eur)}
                />
                <InfoRow
                  label="Effectif"
                  value={
                    supplier.employee_count
                      ? `${supplier.employee_count.toLocaleString('fr-FR')} employés`
                      : null
                  }
                />
                <InfoRow
                  label="Année de création"
                  value={supplier.founded_year?.toString()}
                />
                <InfoRow
                  label="Note de crédit"
                  value={supplier.credit_rating}
                />
              </CardContent>
            </Card>

            {/* Notes */}
            {supplier.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {supplier.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab Évaluations */}
        <TabsContent value="assessments">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {supplier.completed_assessments} évaluation
                {supplier.completed_assessments !== 1 ? 's' : ''} complétée
                {supplier.completed_assessments !== 1 ? 's' : ''}
              </p>
              <Button size="sm" asChild>
                <Link
                  href={`/home/risk-assessments/new?supplier=${supplier.id}`}
                >
                  Nouvelle évaluation
                </Link>
              </Button>
            </div>

            {supplier.risk_assessments.length === 0 ? (
              <EmptyTabState
                icon={FileText}
                title="Aucune évaluation"
                description="Lancez une première évaluation de risque pour ce fournisseur."
                actionLabel="Créer une évaluation"
                actionHref={`/home/risk-assessments/new?supplier=${supplier.id}`}
              />
            ) : (
              supplier.risk_assessments.map((assessment) => (
                <Link
                  key={assessment.id}
                  href={`/home/risk-assessments/${assessment.id}`}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {assessment.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(assessment.assessment_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {assessment.global_score !== null && (
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                          {assessment.global_score}
                        </span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      {ASSESSMENT_STATUS_LABELS[assessment.status as keyof typeof ASSESSMENT_STATUS_LABELS] ?? assessment.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab Alertes */}
        <TabsContent value="alerts">
          <div className="space-y-3">
            {supplier.alerts.length === 0 ? (
              <EmptyTabState
                icon={Bell}
                title="Aucune alerte"
                description="Ce fournisseur n'a déclenché aucune alerte."
              />
            ) : (
              supplier.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
                >
                  <div
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      alert.severity === 'critical'
                        ? 'bg-red-500'
                        : alert.severity === 'warning'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.title}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          ALERT_SEVERITY_COLORS[alert.severity as AlertSeverity] ??
                          'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {ALERT_SEVERITY_LABELS[alert.severity as AlertSeverity] ?? alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {alert.score_snapshot !== null && (
                        <span className="text-xs text-gray-400">
                          Score : {alert.score_snapshot}/100
                        </span>
                      )}
                      {alert.score_delta !== null && alert.score_delta !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 text-xs ${alert.score_delta < 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {alert.score_delta < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {alert.score_delta > 0 ? '+' : ''}
                          {alert.score_delta} pts
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatDate(alert.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab Contacts */}
        <TabsContent value="contacts">
          <div className="space-y-3">
            {supplier.supplier_contacts.length === 0 ? (
              <EmptyTabState
                icon={Users}
                title="Aucun contact"
                description="Ajoutez les contacts de ce fournisseur."
              />
            ) : (
              supplier.supplier_contacts
                .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                .map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {contact.first_name.charAt(0)}
                      {contact.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.is_primary && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            Principal
                          </span>
                        )}
                      </div>
                      {contact.job_title && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {contact.job_title}
                          {contact.department && ` — ${contact.department}`}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
                          >
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-gray-500 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-200 text-right">
        {value ?? <span className="text-gray-300">—</span>}
      </dd>
    </div>
  );
}

function EmptyTabState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
        <Icon className="h-6 w-6 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
