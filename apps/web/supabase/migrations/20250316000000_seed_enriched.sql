/*
 * ================================================================
 * VendorShield — Seed enrichi (20 fournisseurs simulés)
 * Fichier : supabase/migrations/20250316000000_seed_enriched.sql
 *
 * Ce fichier est idempotent : on_conflict(id) do nothing sur les inserts
 * Pour reset complet : pnpm run supabase:web:reset
 * ================================================================
 */

do $$
declare
  v_account_id  uuid := 'cee23de7-9d39-4948-9c1f-0b98ad9c9a6a';
  v_user_id     uuid := 'cee23de7-9d39-4948-9c1f-0b98ad9c9a6a';

  -- 20 fournisseurs (IDs fixes pour idempotence)
  s01 uuid := '11111111-0001-0000-0000-000000000001';
  s02 uuid := '11111111-0001-0000-0000-000000000002';
  s03 uuid := '11111111-0001-0000-0000-000000000003';
  s04 uuid := '11111111-0001-0000-0000-000000000004';
  s05 uuid := '11111111-0001-0000-0000-000000000005';
  s06 uuid := '11111111-0001-0000-0000-000000000006';
  s07 uuid := '11111111-0001-0000-0000-000000000007';
  s08 uuid := '11111111-0001-0000-0000-000000000008';
  s09 uuid := '11111111-0001-0000-0000-000000000009';
  s10 uuid := '11111111-0001-0000-0000-000000000010';
  s11 uuid := '11111111-0001-0000-0000-000000000011';
  s12 uuid := '11111111-0001-0000-0000-000000000012';
  s13 uuid := '11111111-0001-0000-0000-000000000013';
  s14 uuid := '11111111-0001-0000-0000-000000000014';
  s15 uuid := '11111111-0001-0000-0000-000000000015';
  s16 uuid := '11111111-0001-0000-0000-000000000016';
  s17 uuid := '11111111-0001-0000-0000-000000000017';
  s18 uuid := '11111111-0001-0000-0000-000000000018';
  s19 uuid := '11111111-0001-0000-0000-000000000019';
  s20 uuid := '11111111-0001-0000-0000-000000000020';

  -- UUIDs évaluations
  a01 uuid := '22222222-0001-0000-0000-000000000001';
  a02 uuid := '22222222-0001-0000-0000-000000000002';
  a03 uuid := '22222222-0001-0000-0000-000000000003';
  a04 uuid := '22222222-0001-0000-0000-000000000004';
  a05 uuid := '22222222-0001-0000-0000-000000000005';
  a06 uuid := '22222222-0001-0000-0000-000000000006';
  a07 uuid := '22222222-0001-0000-0000-000000000007';
  a08 uuid := '22222222-0001-0000-0000-000000000008';
  a09 uuid := '22222222-0001-0000-0000-000000000009';
  a10 uuid := '22222222-0001-0000-0000-000000000010';
  a11 uuid := '22222222-0001-0000-0000-000000000011';
  a12 uuid := '22222222-0001-0000-0000-000000000012';

begin

-- ================================================================
-- FOURNISSEURS (20 entrées, noms cohérents avec leurs pays)
-- Scores : financial/operational/geopolitical/esg → global
-- ================================================================
insert into public.suppliers (
  id, account_id, name, legal_name, category, status, criticality,
  country_code, country_name, city,
  annual_revenue_eur, employee_count, annual_spend_eur, spend_percentage, is_sole_source,
  global_score, financial_score, operational_score, geopolitical_score, esg_score,
  last_assessed_at, notes, created_by, updated_by
) values
-- 🇩🇪 Allemagne
(s01, v_account_id, 'AutoParts Bayern GmbH', 'AutoParts Bayern Gesellschaft mit beschränkter Haftung',
 'components', 'active', 'critical', 'DE', 'Allemagne', 'Stuttgart',
 340000000, 2800, 6200000, 18.5, false,
 84, 89, 82, 91, 78,
 now() - interval '5 days',
 'Fournisseur stratégique pièces moteur. Certifié IATF 16949. Relation 12 ans.',
 v_user_id, v_user_id),

-- 🇫🇷 France
(s02, v_account_id, 'AéroPrecision SAS', 'AéroPrecision Société par Actions Simplifiée',
 'components', 'active', 'critical', 'FR', 'France', 'Toulouse',
 180000000, 1200, 4800000, 14.3, false,
 79, 82, 77, 88, 74,
 now() - interval '12 days',
 'Sous-traitant aéronautique Tier 1. Certifié AS9100. Contrat pluriannuel Airbus.',
 v_user_id, v_user_id),

-- 🇨🇳 Chine - risque critique
(s03, v_account_id, 'SinoElec Manufacturing Co.', 'SinoElec Manufacturing Co., Ltd.',
 'components', 'active', 'critical', 'CN', 'Chine', 'Shenzhen',
 95000000, 3200, 5100000, 15.2, true,
 31, 42, 28, 22, 35,
 now() - interval '3 days',
 'SOLE SOURCE — Composants PCBA critiques. Situation financière dégradée. Audit qualité Q2 échoué.',
 v_user_id, v_user_id),

-- 🇮🇳 Inde
(s04, v_account_id, 'PharmaIngredients Mumbai Ltd.', 'PharmaIngredients Mumbai Limited',
 'raw_materials', 'active', 'high', 'IN', 'Inde', 'Mumbai',
 62000000, 890, 2900000, 8.7, false,
 55, 58, 52, 60, 48,
 now() - interval '18 days',
 'Principes actifs pharmaceutiques. Certifié GMP. Turnover élevé équipe R&D.',
 v_user_id, v_user_id),

-- 🇧🇷 Brésil
(s05, v_account_id, 'AgroSul Commodities SA', 'AgroSul Commodities Sociedade Anônima',
 'raw_materials', 'active', 'medium', 'BR', 'Brésil', 'São Paulo',
 420000000, 560, 1800000, 5.4, false,
 62, 70, 65, 55, 58,
 now() - interval '25 days',
 'Soja, maïs et cacao. Exposition devise BRL. Risque climatique région Mato Grosso.',
 v_user_id, v_user_id),

-- 🇹🇷 Turquie
(s06, v_account_id, 'TextileMed Bursa AŞ', 'TextileMed Bursa Anonim Şirketi',
 'components', 'active', 'high', 'TR', 'Turquie', 'Bursa',
 48000000, 640, 1400000, 4.2, false,
 43, 55, 40, 32, 44,
 now() - interval '8 days',
 'Tissus techniques automobiles. Inflation turque impacte les prix. Risque change TRY.',
 v_user_id, v_user_id),

-- 🇵🇱 Pologne
(s07, v_account_id, 'PolLogistics Wrocław Sp.z.o.o.', 'PolLogistics Wrocław Spółka z ograniczoną odpowiedzialnością',
 'logistics', 'active', 'medium', 'PL', 'Pologne', 'Wrocław',
 95000000, 720, 2200000, 6.6, false,
 72, 75, 74, 80, 64,
 now() - interval '15 days',
 'Logistique routière Europe centrale. Bien intégré réseau CEE. Délais respectés 94%.',
 v_user_id, v_user_id),

-- 🇲🇦 Maroc
(s08, v_account_id, 'CableMed Tanger SARL', 'CableMed Tanger Société à Responsabilité Limitée',
 'components', 'active', 'high', 'MA', 'Maroc', 'Tanger',
 38000000, 1100, 3300000, 9.9, false,
 68, 65, 71, 72, 63,
 now() - interval '22 days',
 'Câblage automobile. Zone franche Tanger Med. Bonne performance qualité.',
 v_user_id, v_user_id),

-- 🇷🇺 Russie - critique/sanctions
(s09, v_account_id, 'UralMetal Chelyabinsk OOO', 'ООО УралМеталл Челябинск',
 'raw_materials', 'under_review', 'critical', 'RU', 'Russie', 'Chelyabinsk',
 210000000, 4500, 4200000, 12.6, true,
 12, 18, 20, 8, 15,
 now() - interval '1 day',
 'URGENCE SANCTIONS — Aciers spéciaux. Exposition EU 833/2014. Phase-out obligatoire 6 mois. SOLE SOURCE.',
 v_user_id, v_user_id),

-- 🇺🇸 USA
(s10, v_account_id, 'AeroElectronics Corp.', 'AeroElectronics Corporation',
 'technology', 'active', 'critical', 'US', 'États-Unis', 'San Jose',
 850000000, 5200, 7800000, 23.3, false,
 87, 91, 85, 93, 82,
 now() - interval '7 days',
 'Semiconducteurs et FPGA spéciaux. Partenaire Gold Intel/Xilinx. Solide financièrement.',
 v_user_id, v_user_id),

-- 🇻🇳 Vietnam
(s11, v_account_id, 'HanoiTextile Manufacturing JSC', 'Công ty Cổ phần Dệt may Hà Nội',
 'packaging', 'active', 'low', 'VN', 'Vietnam', 'Hanoï',
 28000000, 1800, 900000, 2.7, false,
 58, 55, 62, 60, 52,
 now() - interval '40 days',
 'Emballages souples et textiles techniques. OTD 88%. Risque EPD à surveiller.',
 v_user_id, v_user_id),

-- 🇩🇪 Allemagne #2
(s12, v_account_id, 'ChemBase Frankfurt AG', 'ChemBase Frankfurt Aktiengesellschaft',
 'chemicals', 'active', 'high', 'DE', 'Allemagne', 'Francfort',
 520000000, 3100, 3700000, 11.1, false,
 76, 82, 74, 88, 68,
 now() - interval '14 days',
 'Solvants et résines industrielles. Certifié REACH. Quelques produits SVHC en cours de substitution.',
 v_user_id, v_user_id),

-- 🇰🇷 Corée du Sud
(s13, v_account_id, 'KorBattery Solutions Co.', 'KorBattery Solutions 주식회사',
 'components', 'active', 'critical', 'KR', 'Corée du Sud', 'Séoul',
 290000000, 2100, 5500000, 16.5, false,
 81, 85, 79, 88, 76,
 now() - interval '10 days',
 'Cellules Li-ion et BMS. Homologué véhicules électriques. Investissements gigatonne 2026.',
 v_user_id, v_user_id),

-- 🇳🇬 Nigeria - risque élevé
(s14, v_account_id, 'LagosOil Extractives Ltd.', 'LagosOil Extractives Limited',
 'energy', 'active', 'medium', 'NG', 'Nigeria', 'Lagos',
 980000000, 3800, 2100000, 6.3, false,
 27, 35, 22, 20, 32,
 now() - interval '6 days',
 'Pétrole brut et lubrifiants. Instabilité politique delta Niger. 3 incidents sécurité 2024.',
 v_user_id, v_user_id),

-- 🇨🇭 Suisse
(s15, v_account_id, 'SwissPrecision SA', 'SwissPrecision Société Anonyme',
 'components', 'active', 'high', 'CH', 'Suisse', 'Lausanne',
 75000000, 320, 1600000, 4.8, true,
 90, 94, 88, 95, 87,
 now() - interval '4 days',
 'Microcomposants de précision. SOLE SOURCE (niche unique). Solide financièrement. ISO 13485 médical.',
 v_user_id, v_user_id),

-- 🇲🇾 Malaisie
(s16, v_account_id, 'MalayPCB Technologies SDN BHD', 'MalayPCB Technologies Sendirian Berhad',
 'components', 'active', 'medium', 'MY', 'Malaisie', 'Penang',
 120000000, 1500, 2800000, 8.4, false,
 65, 68, 67, 70, 55,
 now() - interval '30 days',
 'PCB et assemblage électronique. Zone franche Penang. OTD 91%. Risque concentration geograph.',
 v_user_id, v_user_id),

-- 🇦🇷 Argentine
(s17, v_account_id, 'SoyaSur Commodities SA', 'SoyaSur Commodities Sociedad Anónima',
 'raw_materials', 'active', 'low', 'AR', 'Argentine', 'Buenos Aires',
 280000000, 420, 1100000, 3.3, false,
 44, 48, 50, 40, 38,
 now() - interval '35 days',
 'Protéines végétales et huiles. Hyperinflation ARS. Risque change et instabilité macro.',
 v_user_id, v_user_id),

-- 🇮🇹 Italie
(s18, v_account_id, 'ItalDesign Torino Srl', 'ItalDesign Torino Società a Responsabilità Limitata',
 'services', 'active', 'medium', 'IT', 'Italie', 'Turin',
 95000000, 680, 1300000, 3.9, false,
 74, 78, 73, 87, 68,
 now() - interval '20 days',
 'Bureau d''études et ingénierie produit. Partenaire design véhicules premium.',
 v_user_id, v_user_id),

-- 🇵🇰 Pakistan - risque élevé
(s19, v_account_id, 'KarachiTextile Mills Ltd.', 'Karachi Textile Mills Limited',
 'packaging', 'under_review', 'medium', 'PK', 'Pakistan', 'Karachi',
 42000000, 2200, 800000, 2.4, false,
 33, 38, 30, 28, 40,
 now() - interval '5 days',
 'SOUS SURVEILLANCE — Emballages papier/carton. Crise économique Pakistan. Conformité ESG insuffisante.',
 v_user_id, v_user_id),

-- 🇸🇬 Singapour
(s20, v_account_id, 'SingaLogistics Pte Ltd.', 'SingaLogistics Private Limited',
 'logistics', 'active', 'low', 'SG', 'Singapour', 'Singapour',
 320000000, 2400, 1900000, 5.7, false,
 88, 90, 89, 92, 84,
 now() - interval '9 days',
 'Opérateur logistique maritime Asie-Pacifique. HUB Singapour. Performance excellente.',
 v_user_id, v_user_id)

on conflict (id) do update set
  global_score = excluded.global_score,
  last_assessed_at = excluded.last_assessed_at;

-- ================================================================
-- ÉVALUATIONS (12 — pour les fournisseurs les plus critiques)
-- ================================================================
insert into public.risk_assessments (
  id, supplier_id, account_id, title,
  assessment_date, next_review_date, status, version,
  global_score, financial_score, operational_score, geopolitical_score, esg_score,
  weight_financial, weight_operational, weight_geopolitical, weight_esg,
  executive_summary, analyst_notes, mitigation_plan,
  created_by, updated_by
) values
(a01, s01, v_account_id, 'Évaluation annuelle 2025 — AutoParts Bayern',
 '2025-03-16', '2026-03-16', 'approved', 1,
 84, 89, 82, 91, 78, 30, 30, 20, 20,
 'Fournisseur stratégique solide. Score global 84/100. Certifications à jour.',
 'Ratio dette/capitaux propres sain. Aucun incident qualité en 18 mois.',
 'Renouveler contrat 2026 avec clause d''innovation co-développement.',
 v_user_id, v_user_id),

(a02, s03, v_account_id, 'Évaluation urgence — SinoElec Manufacturing',
 '2025-03-14', '2025-06-14', 'completed', 3,
 31, 42, 28, 22, 35, 30, 30, 20, 20,
 'CRITIQUE — Score 31/100. Sole source avec dégradation financière confirmée.',
 'Audit qualité Q2 2025 : 14 non-conformités majeures. OTD 68%. Dirigeant changé.',
 '1) Qualifier 2 alternatives sous 90j. 2) Stock sécurité 90j. 3) Audit mensuel.',
 v_user_id, v_user_id),

(a03, s09, v_account_id, 'Évaluation sanctions — UralMetal Chelyabinsk',
 '2025-03-15', '2025-05-15', 'completed', 5,
 12, 18, 20, 8, 15, 30, 30, 20, 20,
 'SCORE CRITIQUE 12/100. Exposition directe sanctions EU. Phase-out immédiat requis.',
 'Entité filiale société listée UE 833/2014 § 1b. Assurances-crédit annulées.',
 'Budget €2.5M qualif. alternatives UE/Turquie. Délai max 180j réglementaire.',
 v_user_id, v_user_id),

(a04, s10, v_account_id, 'Évaluation annuelle 2025 — AeroElectronics',
 '2025-03-09', '2026-03-09', 'approved', 1,
 87, 91, 85, 93, 82, 30, 30, 20, 20,
 'Excellent partenaire. Score 87/100. Notation S&P BBB+. Aucun risque identifié.',
 'CAPEX R&D en hausse +22%. Leadership marché semiconducteurs aéronautiques.',
 'Négocier accord cadre pluriannuel avec clause prix indexée et capacité dédiée.',
 v_user_id, v_user_id),

(a05, s04, v_account_id, 'Évaluation semestrielle S1 — PharmaIngredients',
 '2025-03-03', '2025-09-03', 'completed', 2,
 55, 58, 52, 60, 48, 30, 30, 20, 20,
 'Score moyen 55/100. Conformité GMP maintenue mais marge de sécurité réduite.',
 'Turnover R&D 32% (industrie : 18%). 2 CMO alternatifs identifiés mais non qualifiés.',
 'Lancer qualification 2ème source CMO Europe. Renforcer audits semestriels.',
 v_user_id, v_user_id),

(a06, s06, v_account_id, 'Évaluation risque — TextileMed Bursa',
 '2025-03-08', '2025-09-08', 'completed', 2,
 43, 55, 40, 32, 44, 30, 30, 20, 20,
 'Score 43/100. Contexte géopolitique turc dégradé impacte la relation.',
 'Inflation TRY +65% an. Révision prix acceptée +18%. Délais livraison +12j.',
 'Identifier fournisseur alternatif Portugal/Roumanie. Hedge devise TRY.',
 v_user_id, v_user_id),

(a07, s13, v_account_id, 'Évaluation annuelle 2025 — KorBattery Solutions',
 '2025-03-11', '2026-03-11', 'approved', 1,
 81, 85, 79, 88, 76, 30, 30, 20, 20,
 'Excellent 81/100. Leader mondial cellules Li-ion véhicule électrique.',
 'Investissement gigatonne +€2.3Md. Certification CATL tier supérieur prévu Q4.',
 'Sécuriser volume 2026-2028 via LTA (Long-Term Agreement) avec garantie capacité.',
 v_user_id, v_user_id),

(a08, s14, v_account_id, 'Évaluation urgence — LagosOil Extractives',
 '2025-03-15', '2025-06-15', 'completed', 2,
 27, 35, 22, 20, 32, 25, 25, 30, 20,
 'RISQUE ÉLEVÉ 27/100. Contexte Nigeria très dégradé. 3 incidents sécurité Q1 2025.',
 'Installations offshore delta Niger à 42km zone conflit armé. Assurances en révision.',
 'Réduire dépendance à 30% max. Qualifier fournisseur alternatif Emirats/Arabie.',
 v_user_id, v_user_id),

(a09, s15, v_account_id, 'Évaluation annuelle 2025 — SwissPrecision',
 '2025-03-17', '2026-03-17', 'approved', 1,
 90, 94, 88, 95, 87, 30, 30, 20, 20,
 'Score exceptionnel 90/100. Sole source justifié par niche technologique unique.',
 'Monopole mondial micro-roulement PTFE médical. Relation 15 ans. 0 incident.',
 'Formaliser accord de continuité business (BCP joint) et audit partagé annuel.',
 v_user_id, v_user_id),

(a10, s19, v_account_id, 'Évaluation — KarachiTextile Mills',
 '2025-03-16', '2025-06-16', 'completed', 1,
 33, 38, 30, 28, 40, 30, 30, 20, 20,
 'Score bas 33/100. Contexte Pakistan : instabilité macroéconomique sévère.',
 'Réserves de change Pakistan < 4 semaines d''imports. Risque de défaut fournisseur.',
 'Chercher alternative Turquie/Maroc. Réduire commandes à 50% volume actuel.',
 v_user_id, v_user_id),

(a11, s02, v_account_id, 'Évaluation annuelle 2025 — AéroPrecision',
 '2025-03-04', '2026-03-04', 'approved', 1,
 79, 82, 77, 88, 74, 30, 30, 20, 20,
 'Score 79/100. Partenaire fiable. Certifications aéronautiques maintenues.',
 'Carnet commandes +35% (boom post-COVID aérien). Risque capacité H2 2025.',
 'Réserver capacité 2026 via lettre d''intention. Augmenter stock composants critiques.',
 v_user_id, v_user_id),

(a12, s05, v_account_id, 'Évaluation annuelle 2025 — AgroSul Commodities',
 '2025-02-28', '2025-08-28', 'completed', 1,
 62, 70, 65, 55, 58, 30, 25, 25, 20,
 'Score 62/100. Bonnes performances mais exposition devise et climat.',
 'Sécheresse Mato Grosso Q1 2025 (-18% récolte). BRL/EUR : -12% sur 6 mois.',
 'Introduire clause de prix indexée. Diversifier vers 2 fournisseurs additionnels.',
 v_user_id, v_user_id)

on conflict (id) do update set
  status = excluded.status,
  global_score = excluded.global_score;

-- ================================================================
-- ALERTES (liées aux fournisseurs à risque)
-- ================================================================
insert into public.alerts (
  account_id, supplier_id, assessment_id,
  type, severity, status, title, message, score_snapshot, score_delta
) values
-- Alertes critiques
(v_account_id, s03, a02, 'score_drop', 'critical', 'open',
 'Score critique — SinoElec Manufacturing',
 'Score global 31/100 (−22 pts). Sole source. 14 NC qualité. Action immédiate.',
 31, -22),

(v_account_id, s09, a03, 'threshold_breach', 'critical', 'open',
 'SANCTIONS — UralMetal Chelyabinsk',
 'Exposition confirmée EU 833/2014. Phase-out obligatoire. Assurances annulées.',
 12, -35),

-- Avertissements
(v_account_id, s06, a06, 'threshold_breach', 'warning', 'open',
 'Risque géopolitique — TextileMed Bursa',
 'Score géopolitique 32/100. Inflation TRY +65%. Délais livraison détériorés.',
 43, -12),

(v_account_id, s14, a08, 'threshold_breach', 'critical', 'open',
 'Incidents sécurité — LagosOil Nigeria',
 '3 incidents sécurité Q1 2025 zone delta Niger. Évaluation risque opérationnel en cours.',
 27, -18),

(v_account_id, s04, a05, 'threshold_breach', 'warning', 'open',
 'Turnover équipe R&D — PharmaIngredients',
 'Taux de rotation personnel clé 32% (norme 18%). Risque perte know-how GMP.',
 55, -8),

(v_account_id, s17, null, 'threshold_breach', 'warning', 'open',
 'Risque macro Argentine — SoyaSur',
 'Hyperinflation ARS. Risque renégociation contrat à court terme.',
 44, -6),

(v_account_id, s19, a10, 'score_drop', 'warning', 'open',
 'Instabilité Pakistan — KarachiTextile',
 'Crise réserves change Pakistan. Risque défaut de livraison H2 2025.',
 33, -15),

-- Infos positives résolues
(v_account_id, s10, a04, 'new_assessment', 'info', 'resolved',
 'Évaluation approuvée — AeroElectronics',
 'Score 87/100. Partenaire premium confirmé. Aucune action requise.',
 87, 5),

(v_account_id, s15, a09, 'new_assessment', 'info', 'resolved',
 'Évaluation approuvée — SwissPrecision',
 'Score 90/100. Sole source justifié. BCP joint en préparation.',
 90, 3)

on conflict do nothing;

-- ================================================================
-- RÈGLES D'ALERTES supplémentaires
-- ================================================================
insert into public.alert_rules (
  account_id, name, description, dimension, operator, threshold,
  severity, notify_email, created_by
) values
(v_account_id, 'Score géopolitique critique',
 'Score géopolitique < 25 — pays très risqué', 'geopolitical', '<', 25, 'critical', true, v_user_id),
(v_account_id, 'Score ESG insuffisant',
 'Score ESG < 45 — conformité insuffisante', 'esg', '<', 45, 'warning', false, v_user_id),
(v_account_id, 'Score opérationnel faible',
 'Score opérationnel < 35 — qualité/délais dégradés', 'operational', '<', 35, 'warning', false, v_user_id)

on conflict do nothing;

-- ================================================================
-- AUDIT LOG
-- ================================================================
insert into public.audit_log (
  account_id, user_id, action, entity_type, entity_id, entity_name
) values
(v_account_id, v_user_id, 'create', 'supplier', s01, 'AutoParts Bayern GmbH'),
(v_account_id, v_user_id, 'create', 'supplier', s03, 'SinoElec Manufacturing Co.'),
(v_account_id, v_user_id, 'create', 'supplier', s09, 'UralMetal Chelyabinsk OOO'),
(v_account_id, v_user_id, 'approve', 'assessment', a01, 'Évaluation annuelle — AutoParts Bayern'),
(v_account_id, v_user_id, 'approve', 'assessment', a04, 'Évaluation annuelle — AeroElectronics'),
(v_account_id, v_user_id, 'create', 'alert', s09, 'Alerte sanctions UralMetal'),
(v_account_id, v_user_id, 'update', 'supplier', s19, 'KarachiTextile — Passage under_review')

on conflict do nothing;

end $$;
