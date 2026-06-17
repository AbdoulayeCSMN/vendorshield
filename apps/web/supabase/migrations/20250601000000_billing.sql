-- Billing — abonnements Stripe
--
-- Une ligne par compte. Alimentée exclusivement par le webhook Stripe
-- (service role) ; le client ne peut que lire son propre abonnement.

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  account_id             uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  stripe_customer_id     text UNIQUE,
  stripe_subscription_id text UNIQUE,
  plan                   text, -- 'starter' | 'pro' | 'enterprise'
  status                 text NOT NULL DEFAULT 'incomplete',
                         -- stripe: trialing | active | past_due | canceled | incomplete | unpaid
  quantity               integer NOT NULL DEFAULT 1,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_customer
  ON public.billing_subscriptions(stripe_customer_id);

-- RLS : lecture de son propre abonnement uniquement. Aucune écriture client
-- (le webhook utilise la service role qui contourne RLS).
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_subscriptions_select" ON public.billing_subscriptions
  FOR SELECT TO authenticated
  USING (account_id = (select auth.uid()));

-- Helper : un compte a-t-il un abonnement actif ?
CREATE OR REPLACE FUNCTION public.has_active_subscription(target_account uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.billing_subscriptions
    WHERE account_id = target_account
      AND status IN ('active', 'trialing')
  );
$$;

-- updated_at auto
CREATE OR REPLACE FUNCTION public.update_billing_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_billing_subscriptions_updated_at
BEFORE UPDATE ON public.billing_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_billing_subscriptions_updated_at();
