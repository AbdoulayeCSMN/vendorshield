# Déploiement production (EU) — VendorShield

Runbook complet pour passer de la branche `feat/vendorshield-modules` à une
instance live et conforme RGPD. Les étapes marquées 🔑 nécessitent **tes**
comptes (Supabase, Vercel, Stripe, OpenRouter, Resend).

> Ordre recommandé : Base → Edge Functions → Web → Intégrations → Tests.

---

## 0. Prérequis

- Node 20+, pnpm 10+, Docker (uniquement pour le dev local, **pas** requis pour le déploiement cloud)
- Supabase CLI (`pnpm --filter web supabase --version`)
- Comptes : [Supabase](https://supabase.com), [Vercel](https://vercel.com), [Stripe](https://stripe.com), [OpenRouter](https://openrouter.ai), [Resend](https://resend.com)

```bash
pnpm install
pnpm --filter web typecheck   # doit être vert
pnpm --filter web build       # doit passer
```

---

## 1. Base de données — Supabase Cloud (région EU) 🔑

1. Créer un projet sur supabase.com — **Region = Frankfurt (eu-central-1)** ou Paris (RGPD).
2. Récupérer : `Project URL`, `anon key`, `service_role key`, `Project ref`.
3. Lier et pousser les migrations :

```bash
cd apps/web
supabase link --project-ref <PROJECT_REF>
supabase db push        # applique TOUTES les migrations (billing, data_imports, tiers, …)
```

Vérifie dans Dashboard → Database → Tables que tu as bien :
`suppliers`, `risk_assessments`, `alerts`, `billing_subscriptions`,
`data_imports`, `supply_chain_tiers`, `bankruptcy_predictions`.

---

## 2. Edge Functions + secrets 🔑

```bash
cd apps/web
# Secrets LLM (IA OSINT) — OpenRouter gratuit recommandé
supabase secrets set OPENROUTER_API_KEY=sk-or-...
# (optionnel) modèle, repli Groq
# supabase secrets set OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
# supabase secrets set GROQ_API_KEY=gsk_...

# Déploie toutes les fonctions (osint, tiers, ingestion, prédiction, oecd)
pnpm run deploy:functions
# osint-scan est un cron public :
supabase functions deploy osint-scan --no-verify-jwt
```

---

## 3. Application web — Vercel 🔑

1. Importer le repo sur Vercel, **Root Directory = `apps/web`**, framework Next.js.
2. Variables d'environnement (Production) :

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://app.vendorshield.io

# Billing (étape 4)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_...

# Email (étape 5)
RESEND_API_KEY=re_...
EMAIL_FROM=VendorShield <alertes@vendorshield.io>
ALERTS_WEBHOOK_SECRET=<chaîne-aléatoire-longue>

# IA côté serveur (mêmes valeurs que les secrets Supabase, pour le statut UI)
OPENROUTER_API_KEY=sk-or-...

# Démo publique
DEMO_EMAIL=demo@vendorshield.io
DEMO_PASSWORD=<mot-de-passe-démo>
```

3. Déployer. Mettre à jour `NEXT_PUBLIC_SITE_URL` avec l'URL finale puis redeployer.

---

## 4. Stripe — produits, prix, webhook 🔑

1. Dashboard Stripe → Products : créer **Starter** et **Pro**, chacun avec un prix
   mensuel et annuel → copier les 4 `price_...` dans les env `NEXT_PUBLIC_STRIPE_PRICE_*`.
2. Developers → API keys → `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → endpoint `https://<site>/api/billing/webhook`, événements :
   `checkout.session.completed`, `customer.subscription.created/updated/deleted`
   → copier le **signing secret** dans `STRIPE_WEBHOOK_SECRET`.

---

## 5. Email — Resend + Database Webhook 🔑

1. Resend → API Key → `RESEND_API_KEY`. Vérifier un domaine pour `EMAIL_FROM`
   (sinon `onboarding@resend.dev` en test).
2. Supabase → Database → Webhooks → **Create**:
   - Table : `public.alerts` · Events : `INSERT`
   - Type : HTTP Request · URL : `https://<site>/api/alerts/webhook`
   - Header : `x-webhook-secret` = `<ALERTS_WEBHOOK_SECRET>`

---

## 6. Compte démo public 🔑

Créer l'utilisateur démo (Dashboard → Authentication → Add user) avec
`DEMO_EMAIL` / `DEMO_PASSWORD`, puis lui ajouter quelques fournisseurs de
démonstration (via l'app ou un SQL d'amorçage). `/demo` connectera ce compte en
lecture seule.

---

## 7. Tests de fumée post-déploiement (à cocher)

- [ ] Login + dashboard s'affichent, KPIs chargent
- [ ] `/demo` ouvre le dashboard sans inscription ; une action d'écriture renvoie « lecture seule »
- [ ] Import d'un fichier de `test-data/` → rapport qualité OK
- [ ] Fiche fournisseur → « Analyser avec l'IA » renvoie des signaux (OpenRouter)
- [ ] Fiche fournisseur → « Scorecard PDF » s'ouvre et s'imprime
- [ ] Créer une alerte → email reçu (vérifier logs Resend)
- [ ] `/home/billing` → checkout Stripe en mode test → abonnement actif visible
- [ ] Webhook Stripe : l'abonnement apparaît dans `billing_subscriptions`

---

## 8. RGPD / conformité (mid-market industriel)

- Hébergement **UE** (Supabase EU + région Vercel EU si dispo).
- Préparer : politique de confidentialité, **DPA**, registre des traitements,
  procédure d'export/suppression de compte.
- Pas de SOC2 requis au départ : un **one-pager sécurité** (RLS, chiffrement au
  repos/transit, isolation par compte) suffit en mid-market.

---

## Rollback

- Web : Vercel → redeploy de la version précédente.
- DB : éviter `db reset` en prod. Préparer une migration corrective plutôt qu'un rollback destructif.
