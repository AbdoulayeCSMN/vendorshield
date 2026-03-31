import { NextRequest } from 'next/server';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// ─── Helper — vérifier l'auth ─────────────────────────────────────────────────

async function requireAuth() {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return null;
  return { client, userId: auth.data.id };
}

// ─── Helper — récupérer les données ──────────────────────────────────────────

async function fetchSuppliers(client: ReturnType<typeof getSupabaseServerClient>, supplierId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (client as any)
    .from('supplier_risk_summary')
    .select('*')
    .order('global_score', { ascending: true, nullsFirst: false });

  if (supplierId) query = query.eq('id', supplierId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchAssessmentWithFactors(
  client: ReturnType<typeof getSupabaseServerClient>,
  assessmentId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('risk_assessments')
    .select(`
      *,
      supplier:suppliers(id, name, country_code, country_name, category),
      risk_factors(*)
    `)
    .eq('id', assessmentId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  raw_materials: 'Matières premières', components: 'Composants',
  logistics: 'Logistique',            services: 'Services',
  technology: 'Technologie',          energy: 'Énergie',
  chemicals: 'Chimie',                packaging: 'Emballage',
  maintenance: 'Maintenance',         other: 'Autre',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Faible', medium: 'Modéré', high: 'Élevé', critical: 'Critique',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', under_review: 'En révision',
  suspended: 'Suspendu', inactive: 'Inactif',
};

const DIMENSION_LABELS: Record<string, string> = {
  financial: 'Financier', operational: 'Opérationnel',
  geopolitical: 'Géopolitique', esg: 'Conformité ESG',
};

function fmtEur(n: number | null): string {
  if (n === null) return '';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR');
}

// ─── Générateurs CSV ─────────────────────────────────────────────────────────

function suppliersToCSV(suppliers: Record<string, unknown>[]): string {
  const headers = [
    'Nom', 'Catégorie', 'Statut', 'Criticité', 'Pays', 'Ville',
    'Score global', 'Niveau de risque', 'Score financier', 'Score opérationnel',
    'Score géopolitique', 'Score ESG', 'Dépense annuelle (€)',
    'Part des achats (%)', 'Sole source', 'Alertes ouvertes', 'Évaluations complètes',
    'Dernière évaluation', 'Fournisseur depuis',
  ];

  const rows = suppliers.map(s => [
    s.name,
    CATEGORY_LABELS[s.category as string] ?? s.category,
    STATUS_LABELS[s.status as string] ?? s.status,
    s.criticality,
    s.country_name ?? s.country_code ?? '',
    s.city ?? '',
    s.global_score ?? '',
    RISK_LABELS[s.risk_level as string] ?? '',
    s.financial_score ?? '',
    s.operational_score ?? '',
    s.geopolitical_score ?? '',
    s.esg_score ?? '',
    s.annual_spend_eur ?? '',
    s.spend_percentage ?? '',
    s.is_sole_source ? 'Oui' : 'Non',
    s.open_alerts ?? 0,
    s.completed_assessments ?? 0,
    fmtDate(s.last_assessment_date as string | null),
    fmtDate(s.created_at as string | null),
  ]);

  return [headers, ...rows]
    .map(row =>
      row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
    .join('\n');
}

function assessmentToCSV(assessment: Record<string, unknown>): string {
  const factors = (assessment.risk_factors as Record<string, unknown>[]) ?? [];

  const headers = ['Dimension', 'Critère', 'Score', 'Poids', 'Justification', 'Source'];
  const rows = factors.map(f => [
    DIMENSION_LABELS[f.dimension as string] ?? f.dimension,
    f.factor_label,
    f.score,
    f.weight,
    f.evidence ?? '',
    f.data_source ?? '',
  ]);

  return [headers, ...rows]
    .map(row =>
      row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
    .join('\n');
}

// ─── Générateur HTML → PDF (via Chromium headless côté browser ou html2pdf) ──
// On génère du HTML optimisé pour l'impression que le browser peut imprimer en PDF

function supplierToPDFHtml(assessment: Record<string, unknown>): string {
  const supplier = assessment.supplier as Record<string, unknown>;
  const factors  = (assessment.risk_factors as Record<string, unknown>[]) ?? [];

  const byDim: Record<string, Record<string, unknown>[]> = {};
  for (const f of factors) {
    const dim = f.dimension as string;
    if (!byDim[dim]) byDim[dim] = [];
    byDim[dim].push(f);
  }

  const scoreColor = (s: unknown) =>
    typeof s === 'number'
      ? s >= 70 ? '#16a34a' : s >= 40 ? '#d97706' : '#dc2626'
      : '#9ca3af';

  const dimSections = Object.entries(DIMENSION_LABELS).map(([key, label]) => {
    const dimFactors = byDim[key] ?? [];
    const dimScore   = assessment[`${key}_score`] as number | null;
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-title">${label}</span>
          <span class="score" style="color:${scoreColor(dimScore)}">${dimScore !== null ? dimScore + '/100' : '—'}</span>
        </div>
        <table>
          <thead>
            <tr><th>Critère</th><th>Score</th><th>Poids</th><th>Justification</th></tr>
          </thead>
          <tbody>
            ${dimFactors.map(f => `
              <tr>
                <td>${f.factor_label}</td>
                <td style="color:${scoreColor(f.score)};font-weight:600">${f.score}</td>
                <td>${f.weight}</td>
                <td class="evidence">${f.evidence ?? '—'}</td>
              </tr>
            `).join('')}
            ${dimFactors.length === 0 ? '<tr><td colspan="4" style="color:#9ca3af;text-align:center">Aucun facteur enregistré</td></tr>' : ''}
          </tbody>
        </table>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport de risque — ${supplier?.name ?? 'Fournisseur'}</title>
<style>
  @page { margin: 20mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; font-size: 12px; color: #1f2937; line-height: 1.5; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px; }
  .logo { font-size:18px; font-weight:700; color:#1f2937; }
  .logo span { color: #6366f1; }
  .report-meta { text-align:right; color:#6b7280; font-size:11px; }
  .supplier-info { margin-bottom:20px; padding:16px; background:#f9fafb; border-radius:8px; }
  .supplier-name { font-size:18px; font-weight:700; margin-bottom:4px; }
  .supplier-meta { color:#6b7280; font-size:11px; }
  .scores-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:20px; }
  .score-card { padding:12px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; text-align:center; }
  .score-card .label { font-size:10px; color:#9ca3af; margin-bottom:4px; }
  .score-card .value { font-size:20px; font-weight:700; }
  .section { margin-bottom:20px; break-inside:avoid; }
  .section-header { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f3f4f6; border-radius:6px 6px 0 0; border:1px solid #e5e7eb; }
  .section-title { font-weight:600; font-size:13px; }
  .score { font-weight:700; font-size:15px; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:#fff; }
  th { padding:8px 10px; text-align:left; font-size:10px; font-weight:600; color:#6b7280; border:1px solid #e5e7eb; text-transform:uppercase; }
  td { padding:7px 10px; border:1px solid #f3f4f6; font-size:11px; vertical-align:top; }
  tr:nth-child(even) td { background:#f9fafb; }
  .evidence { color:#6b7280; font-style:italic; }
  .notes-box { padding:16px; background:#fffbeb; border:1px solid #fcd34d; border-radius:8px; margin-bottom:16px; }
  .notes-box h3 { font-size:12px; font-weight:600; margin-bottom:6px; }
  .footer { margin-top:30px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:10px; color:#9ca3af; display:flex; justify-content:space-between; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">Vendor<span>Shield</span></div>
  <div class="report-meta">
    <div>Rapport de risque fournisseur</div>
    <div>Généré le ${new Date().toLocaleDateString('fr-FR', { day:'numeric',month:'long',year:'numeric' })}</div>
    <div>Réservé à usage interne — Confidentiel</div>
  </div>
</div>

<div class="supplier-info">
  <div class="supplier-name">${supplier?.name ?? '—'}</div>
  <div class="supplier-meta">
    ${supplier?.country_name ?? supplier?.country_code ?? ''} · 
    ${CATEGORY_LABELS[supplier?.category as string] ?? ''} · 
    Évaluation du ${fmtDate(assessment.assessment_date as string)} · 
    Statut : ${(assessment.status as string)?.replace('_', ' ') ?? ''}
  </div>
</div>

<div class="scores-grid">
  ${[
    ['Score global', assessment.global_score],
    ['Financier', assessment.financial_score],
    ['Opérationnel', assessment.operational_score],
    ['Géopolitique', assessment.geopolitical_score],
    ['ESG', assessment.esg_score],
  ].map(([label, value]) => `
    <div class="score-card">
      <div class="label">${label}</div>
      <div class="value" style="color:${scoreColor(value)}">${value !== null ? value : '—'}</div>
    </div>
  `).join('')}
</div>

${assessment.executive_summary ? `
<div class="notes-box">
  <h3>Synthèse exécutive</h3>
  <p>${assessment.executive_summary}</p>
</div>` : ''}

${dimSections}

${assessment.mitigation_plan ? `
<div class="notes-box" style="background:#f0fdf4;border-color:#86efac">
  <h3>Plan de mitigation</h3>
  <p>${assessment.mitigation_plan}</p>
</div>` : ''}

${assessment.analyst_notes ? `
<div class="notes-box" style="background:#eff6ff;border-color:#93c5fd">
  <h3>Notes de l'analyste</h3>
  <p>${assessment.analyst_notes}</p>
</div>` : ''}

<div class="footer">
  <span>VendorShield — Supplier Risk Intelligence Platform</span>
  <span>${supplier?.name ?? ''} — v${assessment.version ?? 1} — Confidentiel</span>
</div>
</body>
</html>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const auth = await requireAuth();
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const url    = new URL(req.url);
  const supplierId   = url.searchParams.get('supplier_id') ?? undefined;
  const assessmentId = url.searchParams.get('assessment_id') ?? undefined;

  const { client } = auth;

  try {
    // ── CSV : liste fournisseurs ─────────────────────────────────────────────

    if (type === 'csv-suppliers') {
      const suppliers = await fetchSuppliers(client, supplierId);
      const csv = suppliersToCSV(suppliers);
      const filename = `vendorshield-fournisseurs-${new Date().toISOString().split('T')[0]}.csv`;

      return new Response('\uFEFF' + csv, { // BOM UTF-8 pour Excel
        headers: {
          'Content-Type':        'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ── JSON : liste fournisseurs ────────────────────────────────────────────

    if (type === 'json-suppliers') {
      const suppliers = await fetchSuppliers(client, supplierId);
      const filename = `vendorshield-fournisseurs-${new Date().toISOString().split('T')[0]}.json`;

      return new Response(JSON.stringify({
        generated_at: new Date().toISOString(),
        source:       'VendorShield',
        count:        suppliers.length,
        suppliers,
      }, null, 2), {
        headers: {
          'Content-Type':        'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ── CSV : évaluation ─────────────────────────────────────────────────────

    if (type === 'csv-assessment' && assessmentId) {
      const assessment = await fetchAssessmentWithFactors(client, assessmentId);
      const csv = assessmentToCSV(assessment);
      const filename = `evaluation-${assessmentId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;

      return new Response('\uFEFF' + csv, {
        headers: {
          'Content-Type':        'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ── JSON : évaluation complète ───────────────────────────────────────────

    if (type === 'json-assessment' && assessmentId) {
      const assessment = await fetchAssessmentWithFactors(client, assessmentId);
      const filename = `evaluation-${assessmentId.slice(0, 8)}.json`;

      return new Response(JSON.stringify({
        generated_at: new Date().toISOString(),
        source:       'VendorShield',
        assessment,
      }, null, 2), {
        headers: {
          'Content-Type':        'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ── HTML pour impression PDF (client ouvre dans nouvel onglet → Ctrl+P) ─

    if (type === 'pdf-assessment' && assessmentId) {
      const assessment = await fetchAssessmentWithFactors(client, assessmentId);
      const html = supplierToPDFHtml(assessment);

      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Type d\'export inconnu', { status: 400 });

  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
}
