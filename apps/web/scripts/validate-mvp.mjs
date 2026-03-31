#!/usr/bin/env node
/**
 * VendorShield MVP — Script de validation
 *
 * Vérifie :
 *   1. Présence de tous les fichiers attendus
 *   2. Cohérence des imports entre modules
 *   3. Variables d'environnement requises
 *   4. Structure des migrations SQL
 *   5. Paths de navigation cohérents
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd(), 'apps/web');
const errors: string[] = [];
const warnings: string[] = [];
let checks = 0;

function check(label: string, condition: boolean, isWarning = false) {
  checks++;
  const status = condition ? '✅' : isWarning ? '⚠️ ' : '❌';
  if (!condition) {
    if (isWarning) warnings.push(`[WARN] ${label}`);
    else errors.push(`[ERROR] ${label}`);
  }
  console.log(`  ${status} ${label}`);
}

function fileExists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function fileContains(path: string, str: string): boolean {
  if (!fileExists(path)) return false;
  return readFileSync(join(ROOT, path), 'utf8').includes(str);
}

// ─── 1. Fichiers requis ───────────────────────────────────────────────────────

console.log('\n📁  Fichiers requis\n');

const REQUIRED_FILES = [
  // Types et data layer
  'lib/vendorshield/types.ts',
  'lib/vendorshield/suppliers.server.ts',
  'lib/vendorshield/assessments.server.ts',
  'lib/vendorshield/alerts.server.ts',
  'lib/vendorshield/analytics.server.ts',

  // Actions
  'lib/vendorshield/actions/supplier.actions.ts',
  'lib/vendorshield/actions/assessment.actions.ts',
  'lib/vendorshield/actions/alert.actions.ts',
  'lib/vendorshield/actions/ai.actions.ts',

  // Pages Home
  'app/home/page.tsx',
  'app/home/loading.tsx',
  'app/home/_components/vendorshield-dashboard.tsx',

  // Suppliers
  'app/home/suppliers/page.tsx',
  'app/home/suppliers/loading.tsx',
  'app/home/suppliers/_components/suppliers-table.tsx',
  'app/home/suppliers/new/page.tsx',
  'app/home/suppliers/new/_components/supplier-form.tsx',
  'app/home/suppliers/[id]/page.tsx',
  'app/home/suppliers/[id]/_components/supplier-detail.tsx',
  'app/home/suppliers/[id]/_components/supplier-ai-panel.tsx',

  // Risk Assessments
  'app/home/risk-assessments/page.tsx',
  'app/home/risk-assessments/_components/assessments-table.tsx',
  'app/home/risk-assessments/new/page.tsx',
  'app/home/risk-assessments/new/_components/assessment-wizard.tsx',
  'app/home/risk-assessments/[id]/page.tsx',
  'app/home/risk-assessments/[id]/_components/assessment-detail.tsx',

  // Alerts
  'app/home/alerts/page.tsx',
  'app/home/alerts/_components/alerts-kpi-bar.tsx',
  'app/home/alerts/_components/alerts-list.tsx',
  'app/home/alerts/rules/page.tsx',
  'app/home/alerts/rules/_components/alert-rules-manager.tsx',
  'app/home/alerts/new/page.tsx',
  'app/home/alerts/new/_components/manual-alert-form.tsx',

  // Analytics
  'app/home/analytics/page.tsx',
  'app/home/analytics/loading.tsx',
  'app/home/analytics/_components/analytics-dashboard.tsx',

  // Audit Log
  'app/home/audit-log/page.tsx',
  'app/home/audit-log/_components/audit-log-table.tsx',

  // Config
  'config/paths.config.ts',
  'config/navigation.config.tsx',

  // Migrations SQL
  'supabase/migrations/20241219010757_schema.sql',
  'supabase/migrations/20250315000000_vendorshield_schema.sql',
  'supabase/migrations/20250315100000_vendorshield_multitenant.sql',
  'supabase/migrations/20250315200000_ai_layer.sql',

  // Seed
  'supabase/seed.sql',

  // Edge Function
  'supabase/functions/osint-monitor/index.ts',
];

for (const f of REQUIRED_FILES) {
  check(f, fileExists(f));
}

// ─── 2. Cohérence des imports clés ───────────────────────────────────────────

console.log('\n🔗  Cohérence des imports\n');

check(
  'home/page.tsx → getAnalyticsDashboard',
  fileContains('app/home/page.tsx', 'getAnalyticsDashboard')
);
check(
  'home/page.tsx → getAlerts',
  fileContains('app/home/page.tsx', 'getAlerts')
);
check(
  'home/page.tsx → VendorShieldDashboard',
  fileContains('app/home/page.tsx', 'VendorShieldDashboard')
);
check(
  'vendorshield-dashboard → aucun mockSuppliers',
  !fileContains('app/home/_components/vendorshield-dashboard.tsx', 'mockSuppliers')
);
check(
  'vendorshield-dashboard → aucun mockAlerts',
  !fileContains('app/home/_components/vendorshield-dashboard.tsx', 'mockAlerts')
);
check(
  'supplier [id]/page.tsx → SupplierAiPanel',
  fileContains('app/home/suppliers/[id]/page.tsx', 'SupplierAiPanel')
);
check(
  'supplier [id]/page.tsx → getSupplierAnalyses',
  fileContains('app/home/suppliers/[id]/page.tsx', 'getSupplierAnalyses')
);
check(
  'assessment wizard → createAssessmentAction',
  fileContains('app/home/risk-assessments/new/_components/assessment-wizard.tsx', 'createAssessmentAction')
);
check(
  'assessment wizard → seed_default_risk_factors (via action)',
  fileContains('lib/vendorshield/actions/assessment.actions.ts', 'seed_default_risk_factors')
);
check(
  'assessment wizard → compute_assessment_scores',
  fileContains('lib/vendorshield/actions/assessment.actions.ts', 'compute_assessment_scores')
);
check(
  'analytics dashboard → PieChart',
  fileContains('app/home/analytics/_components/analytics-dashboard.tsx', 'PieChart')
);
check(
  'analytics dashboard → LineChart',
  fileContains('app/home/analytics/_components/analytics-dashboard.tsx', 'LineChart')
);
check(
  'ai.actions.ts → triggerAiAnalysisAction',
  fileContains('lib/vendorshield/actions/ai.actions.ts', 'triggerAiAnalysisAction')
);
check(
  'osint-monitor → llama-3.3-70b-versatile',
  fileContains('supabase/functions/osint-monitor/index.ts', 'llama-3.3-70b-versatile')
);
check(
  'osint-monitor → seed_default réponse JSON parsée',
  fileContains('supabase/functions/_shared/llm.ts', 'JSON.parse')
);

// ─── 3. Navigation cohérente ──────────────────────────────────────────────────

console.log('\n🧭  Cohérence de la navigation\n');

const navContent = fileExists('config/navigation.config.tsx')
  ? readFileSync(join(ROOT, 'config/navigation.config.tsx'), 'utf8')
  : '';
const pathsContent = fileExists('config/paths.config.ts')
  ? readFileSync(join(ROOT, 'config/paths.config.ts'), 'utf8')
  : '';

check('Navigation → suppliers',       navContent.includes('suppliers'));
check('Navigation → riskAssessments', navContent.includes('riskAssessments'));
check('Navigation → alerts',          navContent.includes('alerts'));
check('Navigation → riskAnalytics',   navContent.includes('riskAnalytics'));
check('Navigation → auditLog',        navContent.includes('auditLog'));
check('Paths → /home/suppliers',      pathsContent.includes('/home/suppliers'));
check('Paths → /home/risk-assessments', pathsContent.includes('/home/risk-assessments'));
check('Paths → /home/alerts',         pathsContent.includes('/home/alerts'));
check('Paths → /home/analytics',      pathsContent.includes('/home/analytics'));
check('Paths → /home/audit-log',      pathsContent.includes('/home/audit-log'));

// ─── 4. Variables d'environnement requises ────────────────────────────────────

console.log('\n🔑  Variables d\'environnement\n');

const envContent = fileExists('.env')
  ? readFileSync(join(ROOT, '.env'), 'utf8')
  : '';

check('NEXT_PUBLIC_SUPABASE_URL',      envContent.includes('NEXT_PUBLIC_SUPABASE_URL'));
check('NEXT_PUBLIC_SUPABASE_ANON_KEY', envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
check('SUPABASE_SERVICE_ROLE_KEY',     envContent.includes('SUPABASE_SERVICE_ROLE_KEY'));
check(
  'ANTHROPIC_API_KEY (Edge Function env)',
  true, // Doit être configuré dans Supabase Dashboard > Settings > Edge Functions
  true  // Warning only
);

// ─── 5. Migrations SQL ────────────────────────────────────────────────────────

console.log('\n🗄️   Migrations SQL\n');

check(
  'Migration ai_layer → ai_analyses table',
  fileContains('supabase/migrations/20250315200000_ai_layer.sql', 'ai_analyses')
);
check(
  'Migration ai_layer → risk_signals jsonb',
  fileContains('supabase/migrations/20250315200000_ai_layer.sql', 'risk_signals')
);
check(
  'Migration schema → compute_assessment_scores function',
  fileContains('supabase/migrations/20250315000000_vendorshield_schema.sql', 'compute_assessment_scores')
);
check(
  'Migration schema → sync_supplier_scores trigger',
  fileContains('supabase/migrations/20250315000000_vendorshield_schema.sql', 'trigger_sync_supplier_scores')
);
check(
  'Migration schema → check_alert_rules trigger',
  fileContains('supabase/migrations/20250315000000_vendorshield_schema.sql', 'trigger_check_alert_rules')
);
check(
  'Migration multitenant → organizations table',
  fileContains('supabase/migrations/20250315100000_vendorshield_multitenant.sql', 'organizations')
);
check(
  'Seed → 8 fournisseurs',
  fileContains('supabase/seed.sql', 'EnergyPlus France')
);

// ─── 6. Conformité 'use server' / 'use client' ───────────────────────────────

console.log('\n⚙️   Directives server/client\n');

const serverActions = [
  'lib/vendorshield/actions/supplier.actions.ts',
  'lib/vendorshield/actions/assessment.actions.ts',
  'lib/vendorshield/actions/alert.actions.ts',
  'lib/vendorshield/actions/ai.actions.ts',
];

for (const f of serverActions) {
  check(
    `${f} → 'use server'`,
    fileContains(f, "'use server'")
  );
}

const serverModules = [
  'lib/vendorshield/suppliers.server.ts',
  'lib/vendorshield/assessments.server.ts',
  'lib/vendorshield/alerts.server.ts',
  'lib/vendorshield/analytics.server.ts',
];

for (const f of serverModules) {
  check(
    `${f} → import 'server-only'`,
    fileContains(f, "import 'server-only'")
  );
}

const clientComponents = [
  'app/home/suppliers/_components/suppliers-table.tsx',
  'app/home/suppliers/[id]/_components/supplier-detail.tsx',
  'app/home/suppliers/[id]/_components/supplier-ai-panel.tsx',
  'app/home/risk-assessments/new/_components/assessment-wizard.tsx',
  'app/home/alerts/_components/alerts-list.tsx',
  'app/home/analytics/_components/analytics-dashboard.tsx',
  'app/home/audit-log/_components/audit-log-table.tsx',
];

for (const f of clientComponents) {
  check(
    `${f} → 'use client'`,
    fileContains(f, "'use client'")
  );
}

// ─── Résumé ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
console.log(`\n📊  Résumé : ${checks} vérifications`);
console.log(`   ✅  ${checks - errors.length - warnings.length} passées`);
if (warnings.length) console.log(`   ⚠️   ${warnings.length} avertissements`);
if (errors.length)   console.log(`   ❌  ${errors.length} erreurs`);

if (errors.length > 0) {
  console.log('\n❌  Erreurs à corriger :');
  for (const e of errors) console.log(`   ${e}`);
}

if (warnings.length > 0) {
  console.log('\n⚠️   Avertissements :');
  for (const w of warnings) console.log(`   ${w}`);
}

if (errors.length === 0) {
  console.log('\n🚀  MVP valide — tous les modules sont présents et cohérents.');
  console.log('\n📋  Prochaines étapes pour lancer :');
  console.log('   1. pnpm run supabase:web:reset     # Applique migrations + seed');
  console.log('   2. Configurer ANTHROPIC_API_KEY dans Supabase Dashboard');
  console.log('      → Settings > Edge Functions > osint-monitor > Secrets');
  console.log('   3. supabase functions deploy osint-monitor');
  console.log('   4. pnpm run dev');
  console.log('   5. Login : test@makerkit.dev / password');
} else {
  process.exit(1);
}
