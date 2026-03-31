# VendorShield

**AI-native Supplier Risk Intelligence Platform**

VendorShield est une plateforme SaaS B2B de gestion et d'anticipation des risques fournisseurs, construite sur Next.js 15, Supabase et Claude (Anthropic).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15 (App Router, RSC) + TailwindCSS v4 + Shadcn UI |
| Backend | Supabase (PostgreSQL 15, Auth, Storage, Edge Functions) |
| IA | Claude Sonnet (Anthropic) via Edge Functions Deno |
| Charts | Recharts via `@kit/ui/chart` |
| Monorepo | Turborepo + pnpm workspaces |

---

## Architecture des modules

```
apps/web/
├── app/home/
│   ├── page.tsx                    Dashboard principal (données réelles)
│   ├── suppliers/                  Gestion fournisseurs (liste + détail + création)
│   ├── risk-assessments/           Évaluations risque (wizard 6 étapes)
│   ├── alerts/                     Alertes + règles configurables
│   ├── analytics/                  Risk Analytics (8 graphiques)
│   └── audit-log/                  Journal d'audit immuable
│
├── lib/vendorshield/
│   ├── types.ts                    Types TypeScript complets
│   ├── suppliers.server.ts         Data layer fournisseurs
│   ├── assessments.server.ts       Data layer évaluations
│   ├── alerts.server.ts            Data layer alertes + audit log
│   ├── analytics.server.ts         Agrégations analytiques
│   └── actions/
│       ├── supplier.actions.ts     CRUD fournisseurs
│       ├── assessment.actions.ts   Workflow évaluations
│       ├── alert.actions.ts        Workflow alertes + règles
│       └── ai.actions.ts           Déclenchement analyses IA
│
└── supabase/
    ├── migrations/
    │   ├── 20241219010757_schema.sql           Schema Makerkit de base
    │   ├── 20250315000000_vendorshield_schema.sql   9 tables métier + triggers
    │   ├── 20250315100000_vendorshield_multitenant.sql  Multi-tenant + Risk Intelligence
    │   └── 20250315200000_ai_layer.sql         Table ai_analyses
    ├── functions/
    │   ├── osint-monitor/index.ts  Analyse manuelle d'un fournisseur
    │   └── osint-scan/index.ts     Scan OSINT automatique (cron)
    └── seed.sql                    8 fournisseurs + 5 évaluations + alertes
```

---

## Schéma de base de données

### Tables métier

| Table | Description |
|---|---|
| `suppliers` | Référentiel fournisseurs avec 5 scores dénormalisés |
| `supplier_contacts` | Contacts par fournisseur |
| `risk_assessments` | Évaluations de risque (draft → in_progress → completed → approved) |
| `risk_factors` | 24 critères granulaires par évaluation |
| `alert_rules` | Règles de déclenchement configurables |
| `alerts` | Alertes automatiques et manuelles |
| `documents` | Pièces jointes (Supabase Storage) |
| `audit_log` | Journal immuable |
| `ai_analyses` | Analyses IA OSINT |

### Tables multi-tenant

| Table | Description |
|---|---|
| `organizations` | Organisations avec plans (starter/pro/enterprise) |
| `org_members` | 5 rôles : owner, admin, analyst, viewer, auditor |
| `org_invitations` | Invitations par email avec token |
| `sso_configurations` | SAML, OIDC, Google Workspace, Azure, Okta |
| `scoring_templates` | 7 templates sectoriels pré-configurés |
| `weight_profiles` | Pondérations customisables par organisation |
| `risk_indicator_catalog` | 24 indicateurs avec guides de scoring |

### Triggers SQL automatiques

- `trigger_sync_supplier_scores` — Synchronise les 5 scores du fournisseur après approbation d'une évaluation
- `trigger_check_alert_rules` — Vérifie les règles d'alerte après chaque mise à jour de score
- `compute_risk_level` — Calcule `risk_level` depuis `global_score`
- `compute_is_expired` — Calcule `is_expired` sur les documents

### Formule de scoring

```
S_dimension = Σ(score_i × weight_i) / Σ(weight_i)    # Facteurs de la dimension

S_global = Σ(S_dim_j × W_dim_j) / Σ(W_dim_j actifs)  # Moyenne pondérée des 4 dimensions
```

Pondérations par défaut : Financier 30% · Opérationnel 30% · Géopolitique 20% · ESG 20%

---

## Intelligence Artificielle

### osint-monitor (déclenchement manuel)

Déclenché depuis la page détail d'un fournisseur via le bouton "Analyser".

**Flux :**
1. Récupère le contexte complet du fournisseur (scores, alertes, évaluation, notes)
2. Appelle Claude Sonnet avec un prompt structuré
3. Parse la réponse JSON (`risk_signals` + `recommendations`)
4. Déduplique et insère les signaux significatifs dans `public.alerts`
5. Persiste l'analyse dans `public.ai_analyses`

### osint-scan (cron automatique)

Déclenché automatiquement **lundi–vendredi à 7h00 UTC** par le scheduler Supabase.

**Flux :**
- Analyse les 15 fournisseurs actifs les moins récemment scannés
- Pour chaque fournisseur : appel Claude → parse → création alertes `[IA OSINT]`
- Délai 600ms entre chaque appel (rate limiting API)

---

## Démarrage rapide

### Prérequis

- Node.js 20+ · pnpm 9+ · Docker

### 1. Installation

```bash
git clone <repo>
cd <repo>
pnpm install
```

### 2. Démarrage Supabase local

```bash
pnpm run supabase:web:start
```

Appliquer les migrations + données de démonstration :

```bash
pnpm run supabase:web:reset
```

### 3. Lancer l'application

```bash
pnpm run dev
```

### 4. Login de démonstration

```
URL    : http://localhost:3000/auth/sign-in
Email  : test@makerkit.dev
Mot de passe : password
```

Le seed charge automatiquement :
- 8 fournisseurs (Chine, Turquie, Allemagne, USA, Russie, Maroc, France, Inde)
- 5 évaluations de risque avec facteurs détaillés
- 3 alertes ouvertes (2 critiques, 1 info)
- 5 règles d'alerte configurées
- Entrées dans l'audit log

### 5. Configuration IA (optionnel en dev)

Ajouter la variable dans les secrets de l'Edge Function :

```bash
pnpm --filter web supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Déployer les fonctions :

```bash
pnpm --filter web supabase functions deploy osint-monitor
pnpm --filter web supabase functions deploy osint-scan --no-verify-jwt
```

---

## Déploiement en production

### Supabase Cloud

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Lier le projet local :
   ```bash
   pnpm --filter web supabase link
   ```
3. Pousser les migrations :
   ```bash
   pnpm --filter web supabase db push
   ```
4. Configurer `ANTHROPIC_API_KEY` dans Dashboard → Settings → Edge Functions → Secrets
5. Déployer les fonctions :
   ```bash
   pnpm --filter web supabase functions deploy osint-monitor
   pnpm --filter web supabase functions deploy osint-scan --no-verify-jwt
   ```

### Variables d'environnement (production)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://vendorshield.com
```

### Vercel / Railway

Le projet est compatible Vercel et Railway. Pour Railway :

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/9r-iFh)

---

## Validation MVP

Un script de validation vérifie l'intégrité de tous les modules :

```bash
node apps/web/scripts/validate-mvp.mjs
```

Vérifie 95 points : présence des fichiers, cohérence des imports, directives server/client, variables d'environnement, migrations SQL, seed.

---

## Parcours utilisateur principal

```
1. Connexion
         ↓
2. Dashboard → KPIs temps réel + alertes ouvertes + fournisseurs risqués
         ↓
3. Suppliers → Liste filtrée avec scores 4 dimensions
         ↓
4. Supplier detail → Scores + alertes + évaluations + panel IA
         ↓  [clic "Analyser"]
5. AI Panel → Claude analyse le contexte → signaux détectés → alertes créées
         ↓
6. Risk Assessments (new) → Wizard 6 étapes
         · Config : fournisseur + titre + pondérations (7 templates)
         · Financier : 6 critères avec sliders 0-100 + guides
         · Opérationnel : 7 critères
         · Géopolitique : 5 critères
         · ESG : 6 critères
         · Synthèse : scores prévisionnels + notes + finalisation
         ↓  [SQL: compute_assessment_scores() → sync_supplier_scores()]
7. Alerts → 5 KPIs cliquables + workflow acknowledge/resolve/dismiss
         ↓
8. Analytics → 6 sections : KPIs globaux, distribution, dimensions,
               tendance 12 mois, top risqués, exposition pays, sole source
         ↓
9. Audit Log → Journal immuable filtrable avec diff viewer
```

---

## Roadmap post-MVP

### V1 — Data enrichment automatique
- Intégration OECD country risk API (scores géopolitiques automatiques)
- Webhook Dun & Bradstreet pour scores financiers temps réel
- Alertes email via Resend

### V2 — Intelligence prédictive
- Modèle ML de prédiction de faillite (6-24 mois) sur `risk_factors` historiques
- Graphe multi-tiers Tier 1→4 via données douanières
- Simulation de crise (digital twin supply chain)

### V3 — Pipeline multi-agents
- Agent 1 : OSINT monitoring continu (news + réseaux sociaux)
- Agent 2 : Supply chain graph builder automatique
- Agent 3 : Analyse d'impact en cascade
- Agent 4 : Recommandations de mitigation priorisées

---

## License

MIT — Voir [LICENSE](LICENSE)
