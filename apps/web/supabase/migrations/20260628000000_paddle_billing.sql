-- Paddle — colonnes additionnelles sur billing_subscriptions.
--
-- Stripe reste codé (apps/web/lib/billing/stripe.ts) mais inutilisable
-- (compte Stripe indisponible, Maroc non supporté). Paddle (Merchant of
-- Record) devient le chemin de paiement automatisé. Les colonnes
-- plan/status/quantity/current_period_end/cancel_at_period_end sont déjà
-- génériques et réutilisées telles quelles.

alter table public.billing_subscriptions
  add column if not exists paddle_customer_id text unique,
  add column if not exists paddle_subscription_id text unique;

create index if not exists idx_billing_subscriptions_paddle_customer
  on public.billing_subscriptions(paddle_customer_id);
