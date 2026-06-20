# VendorShield

**Plateforme SaaS B2B de gestion et d'anticipation des risques fournisseurs (SRM)**

VendorShield aide les directions achats et supply chain — en particulier dans l'industrie — à **noter, surveiller et anticiper** les risques de leur portefeuille fournisseurs : santé financière, performance opérationnelle, géopolitique, ESG, cyber et climat. Construit sur Next.js 15, Supabase et une couche IA/ML (LLM + modèles prédictifs).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15 (App Router, RSC, Turbopack) + React 19 + TailwindCSS v4 + Shadcn UI |
| Backend | Supabase (PostgreSQL 15, Auth, Storage, Edge Functions Deno, RLS multi-tenant) |
| Copilote LLM | Groq (`llama-3.3-70b-versatile`) → repli OpenRouter, en streaming |
| ML opérationnel | Service Python (FastAPI + MLflow) sous `services/ml/`, avec repli modèle TypeScript |
| OSINT / enrichissement | Edge Functions + Claude (Anthropic) |
| Graphiques | Recharts + react-simple-maps (carte du monde) |
| i18n | react-i18next — **français (défaut), anglais, allemand, haoussa** |
| Monorepo | Turborepo + pnpm workspaces |

---

## Fonctionnalités

### Cœur SRM
- **Référentiel fournisseurs** — fiches détaillées, 5 scores dénormalisés (global, financier, opérationnel, géopolitique, ESG), criticité, dépense.
- **Évaluations de risque** — notation sur **24 critères** pondérés ; les scores se propagent au fournisseur (triggers SQL).
- **Alertes & règles** — règles de seuil configurables + alertes manuelles ; workflow acknowledge / resolve / dismiss.
- **Journal d'audit** immuable.

### Import & data engineering automatisé
- Import **CSV / Excel / JSON** de **fiches fournisseurs** *ou* de **livraisons** (`/home/imports`).
- **Mapping de colonnes assisté par IA** : accepte n'importe quels en-têtes (« Raison sociale » → `name`, etc.), repli déterministe par synonymes.
- Nettoyage + validation + rapport de qualité.

### Analytique & exposition
- **Dashboard** temps réel : KPIs, tendances 12 mois, alertes hebdo, carte du monde des fournisseurs.
- **Cartographie des risques** (matrice probabilité × impact).
- **Exposition portefeuille** : Spend-at-Risk, concentration (HHI), stress-test top 3, mono-sources.
- **Multi-sourcing & diversification** : repère les dépendances mono-source/critiques, propose des alternatives qualifiées + **conseil stratégique IA**.
- **Supply chain** : graphe multi-niveaux (tiers).

### IA & ML prédictif
- **Copilote « Aboki »** — assistant achats/supply chain conscient de tout le périmètre et de l'état réel du compte (page dédiée `/home/copilot` + widget).
- **Prédiction opérationnelle** — probabilité de retard de livraison & défauts (PPM), avec **cold-start global** (prédictions dès le 1er jour pour un nouveau compte) et **ré-entraînement automatique**.
- **Prédiction de défaillance financière** (faillite).
- **Analyses OSINT** (Claude) — manuelle et scan automatique.

### Modules sur la fiche fournisseur (onglets)
Scores 5 dimensions · évaluations · alertes · contacts · prédictions opérationnelles · faillite · **risque climatique** (Open-Meteo) · **posture cyber** · **documents & conformité (CSRD)** · **questionnaires** · **audits** · **plans d'action correctifs (CAPA)** · **KPI scorecard + export PDF** · graphe de réseau.

### Surveillance automatique
- `run_monitoring_scan()` détecte les conditions **temporelles** (documents/contrats qui expirent, évaluations périmées) → crée des **alertes dédupliquées** → **email** via webhook.
- Déclenchable par bouton « Scanner maintenant », cron externe (`/api/monitoring/scan`) ou `pg_cron`.

### Plateforme
- Multi-tenant (RLS par compte), portail fournisseur externe sécurisé (`/portal/[token]`), onboarding guidé, facturation, mode démo public.

---

## Architecture

```
apps/web/
├── app/
│   ├── home/                       Application (dashboard, suppliers, imports, alerts,
│   │   │                           analytics, risk-map, exposure, supply-chain,
│   │   │                           risk-assessments, audit-log, copilot, settings…)
│   │   └── _components/            Widgets partagés (copilote, carte, tendances…)
│   ├── api/
│   │   ├── copilot/                Endpoint LLM (Groq → OpenRouter, SSE)
│   │   ├── monitoring/scan/        Scan de surveillance (cron)
│   │   ├── ml/retrain/             Ré-entraînement ML planifié (cron)
│   │   └── alerts/webhook/         Database Webhook → email (Resend)
│   ├── onboarding/  ·  portal/[token]/  ·  (marketing)/  ·  auth/
│
├── lib/vendorshield/
│   ├── *.server.ts                 Data layers (suppliers, alerts, analytics, exposure,
│   │                               multi-sourcing, copilot…)
│   ├── predictions/                Modèle TS, service ML HTTP, batch + cold-start global
│   └── actions/                    Server actions (import, mapping IA, prédictions,
│                                   sourcing, surveillance, ML retrain…)
│
└── supabase/
    ├── migrations/                 Schéma métier, multi-tenant, IA, prédictions,
    │                               audits/CAPA, surveillance…
    └── functions/                  osint-monitor, osint-scan, bankruptcy-predictor,
                                    data-ingestion, oecd-enrichment, tier-builder

services/ml/                        Service Python FastAPI + MLflow (entraînement/scoring)
test-data/                          Données synthétiques (CSV/JSON) + scripts SQL
```

---

## Scoring

```
S_dimension = Σ(score_i × weight_i) / Σ(weight_i)      # critères d'une dimension
S_global    = Σ(S_dim_j × W_dim_j) / Σ(W_dim_j actifs) # moyenne pondérée des 4 dimensions
```
Pondérations par défaut : Financier 30 % · Opérationnel 30 % · Géopolitique 20 % · ESG 20 %.

`risk_level` est dérivé de `global_score` par trigger ; une évaluation complétée propage ses scores au fournisseur via `sync_supplier_scores()`.

> Note : le scoring 24 critères est **à base de règles** → un nouveau client a de la valeur dès J1, sans attendre d'entraînement ML. Le ML (retard/PPM, faillite) s'active avec l'historique, avec repli sur un modèle global anonymisé.

---

## Démarrage rapide

### Prérequis
Node.js 20+ · pnpm 9+ · (Supabase distant ou local)

### Installation
```bash
pnpm install
```

### Variables d'environnement
Copier `apps/web/.env.example` → `apps/web/.env.local` et renseigner au minimum :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # écritures serveur (import, monitoring, ML)
```
Optionnel (activent les fonctions IA/automatisation) :
```bash
GROQ_API_KEY=gsk_...                       # copilote + mapping IA (recommandé)
OPENROUTER_API_KEY=sk-or-...               # repli copilote/mapping
RESEND_API_KEY=re_...                      # emails d'alerte
EMAIL_FROM=VendorShield <alertes@domaine>
ALERTS_WEBHOOK_SECRET=...                  # Database Webhook Supabase → email
MONITORING_SCAN_SECRET=...                 # cron /api/monitoring/scan et /api/ml/retrain
```

### Migrations
Appliquer les migrations `apps/web/supabase/migrations/` sur votre base Supabase
(localement via `pnpm run supabase:web:reset`, ou manuellement via le SQL Editor
sur un projet distant).

### Lancer
```bash
pnpm run dev          # http://localhost:3000
pnpm --filter web typecheck
pnpm --filter web build
```

---

## Automatisation (production)

| Tâche | Endpoint / fonction | Planification |
|---|---|---|
| Emails d'alerte | Database Webhook Supabase sur `alerts` → `/api/alerts/webhook` | sur INSERT |
| Surveillance (docs/contrats/évaluations) | `run_monitoring_scan()` / `/api/monitoring/scan` | quotidienne |
| Ré-entraînement ML + cold-start | `/api/ml/retrain` | quotidienne |
| Scan OSINT | Edge Function `osint-scan` | lun–ven 7h UTC |

Planification au choix : **pg_cron** (tout dans Supabase) ou **Vercel Cron** (`vercel.json`).
Détails et secrets : commentaires dans chaque route + `apps/web/.env.example`.

---

## Service ML (optionnel)

Le service Python (`services/ml/`) entraîne et sert les prédictions opérationnelles via MLflow.
L'application l'appelle par HTTP (`predictViaMlService`) et **retombe automatiquement** sur le
modèle TypeScript embarqué s'il est indisponible — l'app fonctionne donc sans le service.

```bash
cd services/ml
cp .env.example .env        # renseigner VS_ML_DATABASE_URL, VS_ML_API_KEY…
# voir services/ml/README pour l'entraînement et le lancement de l'API
```

---

## Internationalisation

Interface disponible en **français (défaut)**, **anglais**, **allemand** et **haoussa**.
Sélecteur de langue dans la barre latérale ; traductions sous `apps/web/public/locales/{fr,en,de,ha}/`.

---

## License

Voir le fichier de licence du dépôt.
