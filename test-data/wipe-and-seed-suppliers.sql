-- ============================================================================
-- VendorShield — Vider la table fournisseurs et insérer 40 fournisseurs synthétiques
-- À exécuter dans Supabase → SQL Editor. ⚠️ DESTRUCTIF : supprime tous les
-- fournisseurs du compte (et en cascade leurs livraisons, évaluations, alertes,
-- prédictions...). `risk_level` est calculé automatiquement par trigger depuis
-- `global_score`.
-- ============================================================================
DO $$
DECLARE
  v_account uuid;
BEGIN
  -- Compte cible : celui des fournisseurs existants, sinon le premier compte.
  v_account := (SELECT account_id FROM public.suppliers LIMIT 1);
  IF v_account IS NULL THEN
    v_account := (SELECT id FROM public.accounts ORDER BY created_at LIMIT 1);
  END IF;

  -- Vider les fournisseurs de ce compte.
  DELETE FROM public.suppliers WHERE account_id = v_account;

  -- Insérer les fournisseurs synthétiques.
  INSERT INTO public.suppliers
    (account_id, name, legal_name, registration_number, country_code, country_name, city, category, criticality, status, annual_spend_eur, employee_count, founded_year, credit_rating, is_sole_source, global_score, financial_score, operational_score, geopolitical_score, esg_score, website)
  VALUES
    (v_account, 'ÉlectroniqueGlobal S.A.', 'ÉlectroniqueGlobal S.A.', 'US809570', 'US', 'États-Unis', 'Chicago', 'components', 'high', 'inactive', 120000, 35, 2012, 'BBB', true, 39, 26, 34, 35, 53, 'https://www.électronique-1.example.com'),
    (v_account, 'MineraisTech Sp. z o.o.', 'MineraisTech Sp. z o.o.', 'MA948749', 'MA', 'Maroc', 'Casablanca', 'raw_materials', 'high', 'active', 600000, 1200, 2002, 'A', true, 79, 74, 82, 67, 66, 'https://www.minerais-2.example.com'),
    (v_account, 'Roulements Inc.', 'Roulements Inc.', 'IN662275', 'IN', 'Inde', 'Bangalore', 'components', 'medium', 'under_review', 2500000, 35, 2010, 'A', false, 27, 32, 45, 21, 13, 'https://www.roulements-3.example.com'),
    (v_account, 'MaintenancePro S.p.A', 'MaintenancePro S.p.A', 'FR575435', 'FR', 'France', 'Nantes', 'services', 'low', 'active', 600000, 150, 1997, 'AA', false, 70, 69, 56, 62, 86, 'https://www.maintenance-4.example.com'),
    (v_account, 'IngénierieIndustries AŞ', 'IngénierieIndustries AŞ', 'BR983794', 'BR', 'Brésil', 'São Paulo', 'services', 'high', 'active', 900000, 3500, 1977, 'CCC', true, 50, 49, 36, 45, 68, 'https://www.ingénierie-5.example.com'),
    (v_account, 'ÉnergieGlobal Pvt Ltd', 'ÉnergieGlobal Pvt Ltd', 'BR377746', 'BR', 'Brésil', 'São Paulo', 'energy', 'high', 'active', 250000, 1200, 2010, 'BB', true, 80, 89, 87, 85, 76, 'https://www.énergie-6.example.com'),
    (v_account, 'MROPro SARL', 'MROPro SARL', 'IT930555', 'IT', 'Italie', 'Bologne', 'maintenance', 'low', 'under_review', 250000, 540, 1979, 'BBB', false, 41, 47, 52, 56, 39, 'https://www.mro-7.example.com'),
    (v_account, 'MétauxGlobal Sp. z o.o.', 'MétauxGlobal Sp. z o.o.', 'TR407757', 'TR', 'Turquie', 'Bursa', 'raw_materials', 'medium', 'active', 120000, 320, 1975, 'B', false, 65, 63, 79, 58, 79, 'https://www.métaux-8.example.com'),
    (v_account, 'SystèmesTech Inc.', 'SystèmesTech Inc.', 'DE100599', 'DE', 'Allemagne', 'Stuttgart', 'technology', 'medium', 'under_review', 4200000, 35, 1982, 'A', false, 91, 92, 88, 76, 88, 'https://www.systèmes-9.example.com'),
    (v_account, 'ÉlectroniqueGlobal Pvt Ltd', 'ÉlectroniqueGlobal Pvt Ltd', 'MA234628', 'MA', 'Maroc', 'Tanger', 'components', 'low', 'inactive', 250000, 80, 1991, 'BB', false, 90, 99, 85, 99, 84, 'https://www.électronique-10.example.com'),
    (v_account, 'IoTGlobal Inc.', 'IoTGlobal Inc.', 'BR226882', 'BR', 'Brésil', 'São Paulo', 'technology', 'medium', 'active', 2500000, 35, 1996, 'AAA', false, 88, 99, 84, 84, 70, 'https://www.iot-11.example.com'),
    (v_account, 'AciersPro SARL', 'AciersPro SARL', 'DE349565', 'DE', 'Allemagne', 'Stuttgart', 'raw_materials', 'low', 'under_review', 4200000, 80, 2009, 'AA', false, 31, 49, 49, 43, 28, 'https://www.aciers-12.example.com'),
    (v_account, 'PackagingTech GmbH', 'PackagingTech GmbH', 'JP544154', 'JP', 'Japon', 'Osaka', 'packaging', 'critical', 'under_review', 900000, 3500, 1978, 'B', false, 77, 65, 62, 84, 80, 'https://www.packaging-13.example.com'),
    (v_account, 'ConnecteursTech S.p.A', 'ConnecteursTech S.p.A', 'JP292401', 'JP', 'Japon', 'Osaka', 'components', 'medium', 'under_review', 1500000, 80, 1979, 'BBB', false, 39, 56, 27, 24, 55, 'https://www.connecteurs-14.example.com'),
    (v_account, 'Métaux S.p.A', 'Métaux S.p.A', 'CZ324130', 'CZ', 'Tchéquie', 'Brno', 'raw_materials', 'high', 'active', 2500000, 80, 1999, 'AAA', false, 84, 82, 95, 84, 93, 'https://www.métaux-15.example.com'),
    (v_account, 'OutillageGlobal Pvt Ltd', 'OutillageGlobal Pvt Ltd', 'BR161324', 'BR', 'Brésil', 'São Paulo', 'maintenance', 'high', 'active', 400000, 35, 1978, 'BB', false, 59, 74, 51, 44, 73, 'https://www.outillage-16.example.com'),
    (v_account, 'TransportSolutions GmbH', 'TransportSolutions GmbH', 'DE225710', 'DE', 'Allemagne', 'Hambourg', 'logistics', 'medium', 'inactive', 1500000, 540, 1977, 'BB', false, 52, 39, 60, 70, 67, 'https://www.transport-17.example.com'),
    (v_account, 'SystèmesGlobal Inc.', 'SystèmesGlobal Inc.', 'CN804318', 'CN', 'Chine', 'Canton', 'technology', 'high', 'under_review', 250000, 150, 1979, 'AAA', false, 72, 90, 60, 58, 88, 'https://www.systèmes-18.example.com'),
    (v_account, 'MROTech Inc.', 'MROTech Inc.', 'ES398830', 'ES', 'Espagne', 'Madrid', 'maintenance', 'low', 'under_review', 900000, 3500, 2009, 'B', false, 53, 54, 68, 35, 70, 'https://www.mro-19.example.com'),
    (v_account, 'ConnecteursGroup GmbH', 'ConnecteursGroup GmbH', 'PL385577', 'PL', 'Pologne', 'Cracovie', 'components', 'low', 'inactive', 250000, 80, 1996, 'AA', false, 92, 90, 99, 99, 90, 'https://www.connecteurs-20.example.com'),
    (v_account, 'MétauxGlobal AŞ', 'MétauxGlobal AŞ', 'CZ449759', 'CZ', 'Tchéquie', 'Prague', 'raw_materials', 'low', 'active', 80000, 80, 2003, 'BB', false, 27, 36, 44, 9, 16, 'https://www.métaux-21.example.com'),
    (v_account, 'Transport Inc.', 'Transport Inc.', 'DE233636', 'DE', 'Allemagne', 'Munich', 'logistics', 'medium', 'active', 1500000, 150, 1977, 'A', false, 40, 35, 37, 28, 44, 'https://www.transport-22.example.com'),
    (v_account, 'MROSolutions Co. Ltd', 'MROSolutions Co. Ltd', 'JP938742', 'JP', 'Japon', 'Nagoya', 'maintenance', 'low', 'under_review', 250000, 35, 1986, 'B', false, 52, 55, 60, 49, 51, 'https://www.mro-23.example.com'),
    (v_account, 'Capteurs SARL', 'Capteurs SARL', 'IT956253', 'IT', 'Italie', 'Turin', 'components', 'low', 'active', 400000, 150, 1989, 'AA', false, 50, 33, 44, 57, 53, 'https://www.capteurs-24.example.com'),
    (v_account, 'RoulementsGroup Sp. z o.o.', 'RoulementsGroup Sp. z o.o.', 'PL128941', 'PL', 'Pologne', 'Varsovie', 'components', 'high', 'active', 900000, 80, 2012, 'A', true, 90, 99, 94, 92, 99, 'https://www.roulements-25.example.com'),
    (v_account, 'MaintenanceIndustries S.p.A', 'MaintenanceIndustries S.p.A', 'MA645175', 'MA', 'Maroc', 'Casablanca', 'maintenance', 'high', 'active', 80000, 320, 1979, 'B', false, 77, 79, 66, 78, 91, 'https://www.maintenance-26.example.com'),
    (v_account, 'RevêtementsIndustries S.A.', 'RevêtementsIndustries S.A.', 'PL797229', 'PL', 'Pologne', 'Cracovie', 'chemicals', 'medium', 'active', 1500000, 540, 2011, 'A', false, 46, 53, 63, 28, 47, 'https://www.revêtements-27.example.com'),
    (v_account, 'Services Inc.', 'Services Inc.', 'PL636004', 'PL', 'Pologne', 'Cracovie', 'services', 'medium', 'active', 400000, 1200, 1980, 'A', false, 78, 92, 81, 65, 75, 'https://www.services-28.example.com'),
    (v_account, 'Systèmes S.p.A', 'Systèmes S.p.A', 'US598216', 'US', 'États-Unis', 'Chicago', 'technology', 'high', 'active', 400000, 320, 2001, 'B', false, 27, 33, 40, 34, 24, 'https://www.systèmes-29.example.com'),
    (v_account, 'Métaux AŞ', 'Métaux AŞ', 'IT152657', 'IT', 'Italie', 'Bologne', 'raw_materials', 'high', 'active', 2500000, 3500, 1982, 'BBB', true, 88, 99, 99, 99, 90, 'https://www.métaux-30.example.com'),
    (v_account, 'Cartonnage Sp. z o.o.', 'Cartonnage Sp. z o.o.', 'JP266889', 'JP', 'Japon', 'Osaka', 'packaging', 'high', 'under_review', 2500000, 150, 1990, 'CCC', false, 92, 99, 99, 89, 91, 'https://www.cartonnage-31.example.com'),
    (v_account, 'RoulementsTech S.A.', 'RoulementsTech S.A.', 'VN245095', 'VN', 'Vietnam', 'Hô-Chi-Minh', 'components', 'high', 'active', 120000, 320, 1984, 'B', true, 91, 99, 99, 94, 99, 'https://www.roulements-32.example.com'),
    (v_account, 'ChimieTech AŞ', 'ChimieTech AŞ', 'VN600149', 'VN', 'Vietnam', 'Hô-Chi-Minh', 'chemicals', 'high', 'active', 1500000, 150, 1999, 'CCC', false, 24, 32, 40, 40, 20, 'https://www.chimie-33.example.com'),
    (v_account, 'MaintenanceIndustries Pvt Ltd', 'MaintenanceIndustries Pvt Ltd', 'VN859359', 'VN', 'Vietnam', 'Hô-Chi-Minh', 'services', 'critical', 'under_review', 1500000, 80, 2014, 'BB', true, 65, 72, 83, 48, 52, 'https://www.maintenance-34.example.com'),
    (v_account, 'Adhésifs Pvt Ltd', 'Adhésifs Pvt Ltd', 'US443254', 'US', 'États-Unis', 'Detroit', 'chemicals', 'high', 'under_review', 1500000, 150, 1996, 'CCC', false, 55, 54, 63, 53, 42, 'https://www.adhésifs-35.example.com'),
    (v_account, 'MineraisPro Inc.', 'MineraisPro Inc.', 'VN890870', 'VN', 'Vietnam', 'Hô-Chi-Minh', 'raw_materials', 'high', 'active', 80000, 80, 1976, 'BB', true, 30, 20, 42, 19, 48, 'https://www.minerais-36.example.com'),
    (v_account, 'CartonnageGroup Inc.', 'CartonnageGroup Inc.', 'ES426147', 'ES', 'Espagne', 'Madrid', 'packaging', 'high', 'inactive', 250000, 35, 1994, 'BB', false, 36, 42, 43, 30, 22, 'https://www.cartonnage-37.example.com'),
    (v_account, 'ConseilGlobal S.A.', 'ConseilGlobal S.A.', 'MA464069', 'MA', 'Maroc', 'Tanger', 'services', 'low', 'active', 80000, 35, 2007, 'B', false, 37, 40, 19, 45, 50, 'https://www.conseil-38.example.com'),
    (v_account, 'RevêtementsGlobal Pvt Ltd', 'RevêtementsGlobal Pvt Ltd', 'DE869440', 'DE', 'Allemagne', 'Stuttgart', 'chemicals', 'medium', 'inactive', 250000, 3500, 2009, 'CCC', false, 77, 89, 88, 86, 76, 'https://www.revêtements-39.example.com'),
    (v_account, 'ConseilGroup Pvt Ltd', 'ConseilGroup Pvt Ltd', 'CN452737', 'CN', 'Chine', 'Shenzhen', 'services', 'high', 'under_review', 1500000, 3500, 1995, 'AA', false, 81, 85, 79, 84, 80, 'https://www.conseil-40.example.com');
END $$;
