/*
 * ================================================================
 * VendorShield — Seed de démonstration
 * ================================================================
 * ORDRE OBLIGATOIRE :
 *   1. Insérer le user dans auth.users
 *      → déclenche le trigger on_auth_user_created
 *      → crée automatiquement la ligne dans public.accounts
 *   2. Insérer les données VendorShield (suppliers, etc.)
 *      qui référencent public.accounts(id)
 * ================================================================
 */


-- ================================================================
-- ÉTAPE 1 — Créer le user de test dans auth.users
-- Le trigger kit.new_user_created_setup() va automatiquement
-- créer le compte correspondant dans public.accounts avec le même UUID
-- ================================================================

insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) values (
    'cee23de7-9d39-4948-9c1f-0b98ad9c9a6a',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@makerkit.dev',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Test User"}'::jsonb,
    false,
    '',
    '',
    '',
    ''
)
on conflict (id) do nothing;

-- Attendre que le trigger ait créé le compte (précaution)
-- Le trigger est synchrone (AFTER INSERT) donc pas besoin d'attendre,
-- mais on vérifie explicitement
do $$
begin
    if not exists (
        select 1 from public.accounts
        where id = 'cee23de7-9d39-4948-9c1f-0b98ad9c9a6a'
    ) then
        -- Si le trigger n'a pas fonctionné, on crée le compte manuellement
        insert into public.accounts (id, name, email)
        values (
            'cee23de7-9d39-4948-9c1f-0b98ad9c9a6a',
            'Test User',
            'test@makerkit.dev'
        );
    end if;
end $$;


-- ================================================================
-- ÉTAPE 2 — Données VendorShield
-- ================================================================

do $$
declare
    v_account_id  uuid := 'cee23de7-9d39-4948-9c1f-0b98ad9c9a6a';
    v_user_id     uuid := 'cee23de7-9d39-4948-9c1f-0b98ad9c9a6a';

    s1  uuid := extensions.uuid_generate_v4();
    s2  uuid := extensions.uuid_generate_v4();
    s3  uuid := extensions.uuid_generate_v4();
    s4  uuid := extensions.uuid_generate_v4();
    s5  uuid := extensions.uuid_generate_v4();
    s6  uuid := extensions.uuid_generate_v4();
    s7  uuid := extensions.uuid_generate_v4();
    s8  uuid := extensions.uuid_generate_v4();

    a1  uuid := extensions.uuid_generate_v4();
    a2  uuid := extensions.uuid_generate_v4();
    a3  uuid := extensions.uuid_generate_v4();
    a4  uuid := extensions.uuid_generate_v4();
    a5  uuid := extensions.uuid_generate_v4();

begin

-- ----------------------------------------------------------------
-- FOURNISSEURS
-- ----------------------------------------------------------------
insert into public.suppliers (
    id, account_id,
    name, legal_name, category, status, criticality, tags,
    country_code, country_name, city,
    annual_revenue_eur, employee_count,
    contract_start_date, annual_spend_eur, spend_percentage, is_sole_source,
    global_score, financial_score, operational_score, geopolitical_score, esg_score,
    last_assessed_at, notes, created_by, updated_by
) values
(
    s1, v_account_id,
    'Acier Pro SARL', 'Acier Pro Société à Responsabilité Limitée',
    'raw_materials', 'active', 'critical',
    array['acier','matière première','sole-source'],
    'CN', 'Chine', 'Shanghai',
    45000000, 1200,
    '2021-03-01', 2800000, 12.5, true,
    28, 32, 24, 22, 35,
    now() - interval '15 days',
    'Fournisseur unique aciers spéciaux. Situation financière préoccupante depuis Q3.',
    v_user_id, v_user_id
),
(
    s2, v_account_id,
    'LogiTrans SA', 'LogiTrans Société Anonyme',
    'logistics', 'active', 'high',
    array['logistique','transport','maritime'],
    'TR', 'Turquie', 'Istanbul',
    32000000, 850,
    '2020-06-15', 1500000, 6.8, false,
    41, 55, 38, 35, 40,
    now() - interval '8 days',
    'Opérateur logistique régional. Risque géopolitique accru.',
    v_user_id, v_user_id
),
(
    s3, v_account_id,
    'TechComp GmbH', 'TechComp Gesellschaft mit beschränkter Haftung',
    'components', 'active', 'critical',
    array['électronique','composants','certifié-iso'],
    'DE', 'Allemagne', 'Munich',
    280000000, 3400,
    '2019-01-10', 5200000, 23.1, false,
    82, 88, 79, 85, 77,
    now() - interval '3 days',
    'Partenaire stratégique depuis 6 ans. Certifié ISO 9001, 14001.',
    v_user_id, v_user_id
),
(
    s4, v_account_id,
    'SupplyFlex Inc.', 'SupplyFlex Incorporated',
    'packaging', 'active', 'medium',
    array['emballage','éco-responsable'],
    'US', 'États-Unis', 'Chicago',
    95000000, 650,
    '2022-04-01', 800000, 3.6, false,
    74, 80, 72, 76, 69,
    now() - interval '20 days',
    'Emballages éco-responsables. Quelques retards de livraison notés.',
    v_user_id, v_user_id
),
(
    s5, v_account_id,
    'ChimFlex SARL', 'ChimFlex Société à Responsabilité Limitée',
    'chemicals', 'under_review', 'critical',
    array['chimie','solvants','sanctions','surveillance'],
    'RU', 'Russie', 'Saint-Pétersbourg',
    67000000, 920,
    '2018-09-20', 3100000, 13.8, true,
    35, 40, 33, 25, 42,
    now() - interval '2 days',
    'SOUS SURVEILLANCE — Impact sanctions. Recherche alternative en cours.',
    v_user_id, v_user_id
),
(
    s6, v_account_id,
    'PrintPack Maroc', 'PrintPack Maroc SARL',
    'packaging', 'active', 'low',
    array['emballage','local','maroc'],
    'MA', 'Maroc', 'Casablanca',
    8500000, 120,
    '2023-02-01', 350000, 1.6, false,
    68, 62, 71, 75, 66,
    now() - interval '45 days',
    'Nouveau fournisseur local. Évaluation à renouveler.',
    v_user_id, v_user_id
),
(
    s7, v_account_id,
    'EnergyPlus France', 'EnergyPlus France SAS',
    'energy', 'active', 'high',
    array['énergie','contrat-long-terme','france'],
    'FR', 'France', 'Lyon',
    420000000, 2100,
    '2020-01-01', 4800000, 21.4, false,
    79, 85, 77, 90, 72,
    now() - interval '10 days',
    'Fournisseur énergie principal. Contrat jusqu''en 2027.',
    v_user_id, v_user_id
),
(
    s8, v_account_id,
    'SoftServ Inde', 'SoftServ India Private Limited',
    'technology', 'active', 'medium',
    array['it','offshore','développement'],
    'IN', 'Inde', 'Bangalore',
    52000000, 780,
    '2021-11-15', 1200000, 5.4, false,
    61, 58, 65, 68, 57,
    now() - interval '30 days',
    'Prestataire IT offshore. Turnover élevé identifié.',
    v_user_id, v_user_id
);

-- ----------------------------------------------------------------
-- CONTACTS FOURNISSEURS
-- ----------------------------------------------------------------
insert into public.supplier_contacts
    (supplier_id, account_id, first_name, last_name, job_title, email, phone, is_primary)
values
    (s1, v_account_id, 'Wei',    'Zhang',  'Directeur Commercial Export', 'wei.zhang@acierpro.cn',  '+86 21 8888 0001', true),
    (s3, v_account_id, 'Hans',   'Müller', 'Key Account Manager',        'h.mueller@techcomp.de',  '+49 89 4567 890',  true),
    (s5, v_account_id, 'Dmitri', 'Volkov', 'Directeur des Ventes',       'd.volkov@chimflex.ru',   '+7 812 333 44 55', true),
    (s7, v_account_id, 'Sophie', 'Martin', 'Responsable Grands Comptes', 's.martin@energyplus.fr', '+33 4 72 00 00 01',true);

-- ----------------------------------------------------------------
-- ÉVALUATIONS DE RISQUE
-- ----------------------------------------------------------------
insert into public.risk_assessments (
    id, supplier_id, account_id,
    title, assessment_date, next_review_date, status, version,
    global_score, financial_score, operational_score, geopolitical_score, esg_score,
    weight_financial, weight_operational, weight_geopolitical, weight_esg,
    executive_summary, analyst_notes, mitigation_plan,
    created_by, updated_by
) values
(
    a1, s1, v_account_id,
    'Évaluation annuelle 2025 — Acier Pro SARL',
    '2025-02-28', '2025-08-31', 'completed', 1,
    28, 32, 24, 22, 35,
    30, 30, 20, 20,
    'Situation critique. Score global 28/100 en dégradation. Fournisseur unique.',
    'Ratio dette/EBITDA > 5x. Tensions commerciales UE-Chine. Aucun rapport ESG.',
    'URGENT : 1) Trouver 2 alternatives sous 90j. 2) Renforcer stocks sécurité à 60j.',
    v_user_id, v_user_id
),
(
    a2, s2, v_account_id,
    'Évaluation semestrielle S1 2025 — LogiTrans SA',
    '2025-03-01', '2025-09-01', 'completed', 2,
    41, 55, 38, 35, 40,
    30, 30, 20, 20,
    'Score moyen. Risque géopolitique turc notable. OTD dégradé à 78%.',
    'Livraisons dans les délais : 78% (vs 91% an passé). Risque pays réévalué.',
    'Diversifier vers 1-2 opérateurs logistiques alternatifs MENA.',
    v_user_id, v_user_id
),
(
    a3, s3, v_account_id,
    'Évaluation annuelle 2025 — TechComp GmbH',
    '2025-03-10', '2026-03-10', 'approved', 1,
    82, 88, 79, 85, 77,
    30, 30, 20, 20,
    'Excellente performance. ISO 9001 et 14001 renouvelés. Note S&P BBB+.',
    'Aucun incident qualité en 18 mois. Bilan financier solide.',
    'Envisager partenariat stratégique renforcé (co-développement).',
    v_user_id, v_user_id
),
(
    a4, s5, v_account_id,
    'Évaluation urgence — ChimFlex SARL (Sanctions)',
    '2025-03-13', '2025-06-13', 'completed', 3,
    35, 40, 33, 25, 42,
    30, 30, 20, 20,
    'URGENT — Exposition sanctions EU 2023/1214. Phase-out nécessaire sous 6 mois.',
    '3 produits potentiellement impactés. Assurances-crédit suspendues.',
    'Budget alloué pour qualification 2 fournisseurs alternatifs UE/Maroc.',
    v_user_id, v_user_id
),
(
    a5, s7, v_account_id,
    'Évaluation annuelle 2025 — EnergyPlus France',
    '2025-03-05', '2026-03-05', 'approved', 1,
    79, 85, 77, 90, 72,
    25, 25, 25, 25,
    'Très bon score. Fournisseur stratégique stable. Contrat 2020-2027 sécurisé.',
    'Prix indexés. Risque géopolitique minimal (France). SBTi signataire.',
    'Préparer renégociation contractuelle 2027 dès 2026.',
    v_user_id, v_user_id
);

-- ----------------------------------------------------------------
-- FACTEURS DE RISQUE (évaluation critique Acier Pro)
-- ----------------------------------------------------------------
insert into public.risk_factors
    (assessment_id, account_id, dimension, factor_key, factor_label, weight, score, evidence)
values
    (a1, v_account_id, 'financial',    'credit_rating',        'Notation de crédit & solvabilité',   3, 18, 'Note Moody''s dégradée à Caa2 en janvier 2025.'),
    (a1, v_account_id, 'financial',    'payment_delays',       'Historique des retards de paiement', 2, 35, '3 retards >30 jours sur 12 mois.'),
    (a1, v_account_id, 'financial',    'revenue_stability',    'Stabilité du chiffre d''affaires',   2, 40, 'CA en baisse de 18% sur 2 ans consécutifs.'),
    (a1, v_account_id, 'financial',    'debt_ratio',           'Niveau d''endettement',              2, 22, 'Ratio dette nette/EBITDA > 5x.'),
    (a1, v_account_id, 'operational',  'delivery_reliability', 'Fiabilité des livraisons',           3, 28, 'OTD à 72% (norme secteur : 90%+).'),
    (a1, v_account_id, 'operational',  'quality_certifications','Certifications qualité',            3, 30, 'ISO 9001 expirée depuis juin 2024.'),
    (a1, v_account_id, 'operational',  'substitutability',     'Facilité de substitution',           3, 10, 'FOURNISSEUR UNIQUE. Aucun substitut identifié.'),
    (a1, v_account_id, 'operational',  'bcp_existence',        'Plan de continuité BCP',             2, 20, 'Aucun BCP transmis malgré 2 demandes.'),
    (a1, v_account_id, 'geopolitical', 'country_risk',         'Risque pays Chine',                  4, 30, 'Tensions commerciales UE-Chine persistantes.'),
    (a1, v_account_id, 'geopolitical', 'sanctions_exposure',   'Exposition aux sanctions',           4, 15, 'Entité en surveillance UE depuis décembre 2024.'),
    (a1, v_account_id, 'esg',          'carbon_footprint',     'Empreinte carbone',                  3, 28, 'Aucun rapport carbone disponible.'),
    (a1, v_account_id, 'esg',          'labor_practices',      'Pratiques de travail',               3, 38, 'Audit social 2023 : conditions insuffisantes.'),
    (a1, v_account_id, 'esg',          'corruption_bribery',   'Anti-corruption',                    3, 40, 'Pas de programme anti-corruption documenté.');

-- ----------------------------------------------------------------
-- RÈGLES D'ALERTES
-- ----------------------------------------------------------------
insert into public.alert_rules
    (account_id, name, description, dimension, operator, threshold, severity, notify_email, created_by)
values
    (v_account_id, 'Score global critique',    'Score global < 30',       null,           '<', 30, 'critical', true, v_user_id),
    (v_account_id, 'Score global faible',      'Score global < 50',       null,           '<', 50, 'warning',  true, v_user_id),
    (v_account_id, 'Risque financier critique','Score financier < 30',    'financial',    '<', 30, 'critical', true, v_user_id),
    (v_account_id, 'Risque géopolitique élevé','Score géopolitique < 35', 'geopolitical', '<', 35, 'warning',  true, v_user_id),
    (v_account_id, 'Non-conformité ESG',       'Score ESG < 40',          'esg',          '<', 40, 'warning',  true, v_user_id);

-- ----------------------------------------------------------------
-- ALERTES
-- ----------------------------------------------------------------
insert into public.alerts
    (account_id, supplier_id, assessment_id, type, severity, status,
     title, message, score_snapshot, score_delta)
values
    (v_account_id, s1, a1, 'score_drop',       'critical', 'open',
     'Score critique — Acier Pro SARL',
     'Le score global a chuté de 18 points. Score actuel : 28/100. Action immédiate requise.',
     28, -18),
    (v_account_id, s2, a2, 'threshold_breach', 'warning',  'open',
     'Risque géopolitique — LogiTrans SA',
     'Score géopolitique passé sous le seuil d''alerte (35). Contexte Turquie à surveiller.',
     35, -8),
    (v_account_id, s5, a4, 'threshold_breach', 'critical', 'open',
     'Alerte sanctions — ChimFlex SARL',
     'Exposition potentielle aux sanctions EU 2023/1214. Vérification de conformité requise.',
     25, -22),
    (v_account_id, s3, a3, 'new_assessment',   'info',     'resolved',
     'Évaluation approuvée — TechComp GmbH',
     'Score : 82/100. Aucune action requise.',
     82, 5);

-- ----------------------------------------------------------------
-- AUDIT LOG
-- ----------------------------------------------------------------
insert into public.audit_log
    (account_id, user_id, action, entity_type, entity_id, entity_name)
values
    (v_account_id, v_user_id, 'create',  'supplier',   s1, 'Acier Pro SARL'),
    (v_account_id, v_user_id, 'create',  'supplier',   s2, 'LogiTrans SA'),
    (v_account_id, v_user_id, 'create',  'supplier',   s3, 'TechComp GmbH'),
    (v_account_id, v_user_id, 'create',  'assessment', a1, 'Évaluation annuelle 2025 — Acier Pro SARL'),
    (v_account_id, v_user_id, 'approve', 'assessment', a3, 'Évaluation annuelle 2025 — TechComp GmbH'),
    (v_account_id, v_user_id, 'update',  'supplier',   s5, 'ChimFlex SARL — Passage en under_review');

end $$;