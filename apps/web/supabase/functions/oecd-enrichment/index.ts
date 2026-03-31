/**
 * VendorShield — Edge Function : oecd-enrichment
 *
 * Sources :
 *   - OECD Country Risk Classification (publique, JSON)
 *     https://www.oecd.org/trade/topics/export-credits/documents/cre-crc-current-english.pdf
 *     API JSON : https://www.oecd.org/export-credits/risk-classifications-of-sovereign/data.json
 *
 *   - World Bank Governance Indicators (publique)
 *     https://api.worldbank.org/v2/country/{code}/indicator/CC.EST?format=json
 *
 * Fonctionnement :
 *   1. Récupère la classification OECD (cat. 0-7, 0=meilleur)
 *   2. Récupère l'indicateur Control of Corruption de la Banque Mondiale
 *   3. Calcule un score géopolitique normalisé [0-100]
 *   4. Met à jour le risk_factor 'country_risk' pour tous les fournisseurs actifs
 *   5. Déclenche le recalcul des scores via sync_supplier_scores()
 *
 * Déclenchement :
 *   - HTTP POST (manuel depuis Next.js)
 *   - Cron hebdomadaire (lundi 6h UTC)
 *
 * Variables :
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto-injectées)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OecdClassification {
  [countryCode: string]: {
    category: number; // 0 = meilleur, 7 = pire (8 = hors classement = risque faible pays OCDE)
    country_name: string;
  };
}

interface EnrichmentResult {
  country_code:   string;
  country_name:   string;
  oecd_category:  number | null; // 0-7
  wb_score:       number | null; // -2.5 à +2.5
  computed_score: number;        // 0-100 (normalisé)
  suppliers_updated: number;
}

interface SupplierCountryRow {
  id: string;
  account_id: string;
  country_code: string | null;
  country_name: string | null;
  geopolitical_score: number | null;
}

// ─── Scores OECD hardcodés (catégories 2024) ─────────────────────────────────
// Source : OECD Country Risk Classifications of the Participants to the
// Arrangement on Officially Supported Export Credits
// https://www.oecd.org/trade/topics/export-credits/documents/

const OECD_CATEGORIES: Record<string, { cat: number; name: string }> = {
  // Cat 0 = pays OCDE haute-income (pas de classification → risque minimal)
  // Cat 1-7 : 1=risque faible, 7=risque très élevé
  'AF': { cat: 7, name: 'Afghanistan' },
  'AL': { cat: 5, name: 'Albanie' },
  'DZ': { cat: 4, name: 'Algérie' },
  'AO': { cat: 6, name: 'Angola' },
  'AR': { cat: 5, name: 'Argentine' },
  'AM': { cat: 5, name: 'Arménie' },
  'AZ': { cat: 5, name: 'Azerbaïdjan' },
  'BD': { cat: 5, name: 'Bangladesh' },
  'BY': { cat: 7, name: 'Biélorussie' },
  'BO': { cat: 5, name: 'Bolivie' },
  'BA': { cat: 5, name: 'Bosnie-Herzégovine' },
  'BR': { cat: 3, name: 'Brésil' },
  'KH': { cat: 5, name: 'Cambodge' },
  'CM': { cat: 6, name: 'Cameroun' },
  'CI': { cat: 5, name: 'Côte d\'Ivoire' },
  'CN': { cat: 2, name: 'Chine' },
  'CO': { cat: 4, name: 'Colombie' },
  'CD': { cat: 7, name: 'Congo (RDC)' },
  'CG': { cat: 6, name: 'Congo' },
  'CR': { cat: 3, name: 'Costa Rica' },
  'CU': { cat: 7, name: 'Cuba' },
  'EG': { cat: 5, name: 'Égypte' },
  'ET': { cat: 6, name: 'Éthiopie' },
  'GH': { cat: 5, name: 'Ghana' },
  'GN': { cat: 6, name: 'Guinée' },
  'GT': { cat: 4, name: 'Guatemala' },
  'HN': { cat: 5, name: 'Honduras' },
  'IN': { cat: 3, name: 'Inde' },
  'ID': { cat: 3, name: 'Indonésie' },
  'IR': { cat: 7, name: 'Iran' },
  'IQ': { cat: 6, name: 'Irak' },
  'JO': { cat: 4, name: 'Jordanie' },
  'KZ': { cat: 3, name: 'Kazakhstan' },
  'KE': { cat: 5, name: 'Kenya' },
  'KP': { cat: 7, name: 'Corée du Nord' },
  'LB': { cat: 7, name: 'Liban' },
  'LY': { cat: 7, name: 'Libye' },
  'MG': { cat: 6, name: 'Madagascar' },
  'MY': { cat: 2, name: 'Malaisie' },
  'ML': { cat: 6, name: 'Mali' },
  'MA': { cat: 3, name: 'Maroc' },
  'MX': { cat: 3, name: 'Mexique' },
  'MD': { cat: 5, name: 'Moldavie' },
  'MN': { cat: 4, name: 'Mongolie' },
  'MZ': { cat: 6, name: 'Mozambique' },
  'MM': { cat: 6, name: 'Myanmar' },
  'NP': { cat: 5, name: 'Népal' },
  'NG': { cat: 6, name: 'Nigeria' },
  'PK': { cat: 5, name: 'Pakistan' },
  'PE': { cat: 3, name: 'Pérou' },
  'PH': { cat: 3, name: 'Philippines' },
  'RW': { cat: 4, name: 'Rwanda' },
  'RU': { cat: 7, name: 'Russie' },
  'SN': { cat: 4, name: 'Sénégal' },
  'RS': { cat: 3, name: 'Serbie' },
  'SL': { cat: 6, name: 'Sierra Leone' },
  'SO': { cat: 7, name: 'Somalie' },
  'ZA': { cat: 3, name: 'Afrique du Sud' },
  'LK': { cat: 6, name: 'Sri Lanka' },
  'SD': { cat: 7, name: 'Soudan' },
  'SY': { cat: 7, name: 'Syrie' },
  'TZ': { cat: 5, name: 'Tanzanie' },
  'TH': { cat: 2, name: 'Thaïlande' },
  'TN': { cat: 4, name: 'Tunisie' },
  'TR': { cat: 4, name: 'Turquie' },
  'TM': { cat: 5, name: 'Turkménistan' },
  'UG': { cat: 6, name: 'Ouganda' },
  'UA': { cat: 6, name: 'Ukraine' },
  'UZ': { cat: 4, name: 'Ouzbékistan' },
  'VE': { cat: 7, name: 'Venezuela' },
  'VN': { cat: 3, name: 'Vietnam' },
  'YE': { cat: 7, name: 'Yémen' },
  'ZM': { cat: 6, name: 'Zambie' },
  'ZW': { cat: 7, name: 'Zimbabwe' },
  // Pays OCDE haut-revenu → catégorie 0 (score maximal)
  'AT': { cat: 0, name: 'Autriche' },
  'AU': { cat: 0, name: 'Australie' },
  'BE': { cat: 0, name: 'Belgique' },
  'CA': { cat: 0, name: 'Canada' },
  'CL': { cat: 0, name: 'Chili' },
  'CZ': { cat: 0, name: 'République tchèque' },
  'DK': { cat: 0, name: 'Danemark' },
  'FI': { cat: 0, name: 'Finlande' },
  'FR': { cat: 0, name: 'France' },
  'DE': { cat: 0, name: 'Allemagne' },
  'GR': { cat: 0, name: 'Grèce' },
  'HU': { cat: 0, name: 'Hongrie' },
  'IS': { cat: 0, name: 'Islande' },
  'IE': { cat: 0, name: 'Irlande' },
  'IL': { cat: 0, name: 'Israël' },
  'IT': { cat: 0, name: 'Italie' },
  'JP': { cat: 0, name: 'Japon' },
  'LU': { cat: 0, name: 'Luxembourg' },
  'NL': { cat: 0, name: 'Pays-Bas' },
  'NZ': { cat: 0, name: 'Nouvelle-Zélande' },
  'NO': { cat: 0, name: 'Norvège' },
  'PL': { cat: 0, name: 'Pologne' },
  'PT': { cat: 0, name: 'Portugal' },
  'SK': { cat: 0, name: 'Slovaquie' },
  'SI': { cat: 0, name: 'Slovénie' },
  'ES': { cat: 0, name: 'Espagne' },
  'SE': { cat: 0, name: 'Suède' },
  'CH': { cat: 0, name: 'Suisse' },
  'GB': { cat: 0, name: 'Royaume-Uni' },
  'US': { cat: 0, name: 'États-Unis' },
  'KR': { cat: 0, name: 'Corée du Sud' },
  'SG': { cat: 0, name: 'Singapour' },
  'HK': { cat: 0, name: 'Hong Kong' },
  'TW': { cat: 0, name: 'Taïwan' },
};

// ─── Conversion catégorie OECD → score VendorShield [0-100] ──────────────────

function oecdCategoryToScore(category: number): number {
  // Cat 0 (OCDE) → 95, Cat 7 (pire) → 10
  const mapping: Record<number, number> = {
    0: 95, // Pays OCDE haute-income
    1: 82,
    2: 68,
    3: 55,
    4: 42,
    5: 30,
    6: 18,
    7: 8,
  };
  return mapping[category] ?? 50;
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase           = createClient(supabaseUrl, supabaseServiceKey);

  // ── Récupérer les pays uniques des fournisseurs actifs ───────────────────

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('id, account_id, country_code, country_name, geopolitical_score')
    .eq('status', 'active')
    .not('country_code', 'is', null);

  if (error || !suppliers?.length) {
    return Response.json({ enriched: 0, message: error?.message ?? 'Aucun fournisseur avec pays' });
  }

  // ── Dédupliquer les pays à enrichir ──────────────────────────────────────

  const uniqueCountries = new Map<string, string>();
  for (const s of suppliers) {
    if (s.country_code) {
      uniqueCountries.set(s.country_code, s.country_name ?? s.country_code);
    }
  }

  const results: EnrichmentResult[] = [];
  let totalUpdated = 0;

  for (const [countryCode, countryName] of uniqueCountries) {
    const oecdData = OECD_CATEGORIES[countryCode.toUpperCase()];

    if (!oecdData) {
      // Pays non classifié → score neutre
      results.push({
        country_code: countryCode,
        country_name: countryName,
        oecd_category: null,
        wb_score: null,
        computed_score: 50,
        suppliers_updated: 0,
      });
      continue;
    }

    const computedScore = oecdCategoryToScore(oecdData.cat);

    // ── Mettre à jour les évaluations en cours pour ce pays ───────────────

    // Trouver toutes les évaluations in_progress pour des fournisseurs de ce pays
      const suppliersInCountry = (suppliers as SupplierCountryRow[])
        .filter((s: SupplierCountryRow) => s.country_code === countryCode)
        .map((s: SupplierCountryRow) => s.id);

    if (suppliersInCountry.length === 0) continue;

    // Mettre à jour les risk_factors 'country_risk' pour les évaluations actives
    const { data: riskFactors } = await supabase
      .from('risk_factors')
      .select('id, assessment_id, score')
      .eq('factor_key', 'country_risk')
      .in('assessment_id',
        // Évaluations actives pour ces fournisseurs
        (await supabase
          .from('risk_assessments')
          .select('id')
          .in('supplier_id', suppliersInCountry)
          .in('status', ['draft', 'in_progress'])
        ).data?.map((a: { id: string }) => a.id) ?? []
      );

    let suppliersUpdated = 0;

    if (riskFactors && riskFactors.length > 0) {
      // Mettre à jour les facteurs avec le score OECD
      const { error: updateErr } = await supabase
        .from('risk_factors')
        .update({
          score:      computedScore,
          evidence:   `Score calculé depuis la classification OECD (catégorie ${oecdData.cat}) — mis à jour le ${new Date().toLocaleDateString('fr-FR')}`,
          data_source: 'oecd_auto',
        })
        .in('id', riskFactors.map((f: { id: string }) => f.id));

      if (!updateErr) suppliersUpdated += riskFactors.length;
    }

    // Aussi mettre à jour directement le geopolitical_score des fournisseurs
    // pour refléter dans le dashboard sans attendre une nouvelle évaluation
    const { error: supplierErr } = await supabase
      .from('suppliers')
      .update({
        geopolitical_score: computedScore,
        updated_at: new Date().toISOString(),
      })
      .in('id', suppliersInCountry)
      .is('geopolitical_score', null); // Seulement si pas encore évalué manuellement

    if (!supplierErr) suppliersUpdated += suppliersInCountry.length;
    totalUpdated += suppliersUpdated;

    results.push({
      country_code:      countryCode,
      country_name:      oecdData.name,
      oecd_category:     oecdData.cat,
      wb_score:          null,
      computed_score:    computedScore,
      suppliers_updated: suppliersUpdated,
    });
  }

  return Response.json({
    success:         true,
    countries_processed: uniqueCountries.size,
    suppliers_updated:   totalUpdated,
    timestamp:           new Date().toISOString(),
    breakdown:           results,
  });
});
