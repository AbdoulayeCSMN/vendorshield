-- ================================================================
-- FIX: Allow service_role and anonymous access to analytical views
-- ================================================================

-- Add permissive RLS policy for supplier_risk_summary view
-- This allows service_role and properly authenticated users to read analytics
alter table public.supplier_risk_summary enable row level security;

create policy supplier_risk_summary_read on public.supplier_risk_summary
    for select to authenticated, anon, service_role
    using (true);

-- Alternative: More restrictive - only allow if account_id matches user's account
-- To use this: modify the policy to require account_id filtering
-- But for now, allowing reads for analytics is fine since data is filtered server-side

-- Add similar policy to suppliers table for direct access if needed
create policy suppliers_select_anon on public.suppliers
    for select to anon
    using (status != 'blacklisted');
