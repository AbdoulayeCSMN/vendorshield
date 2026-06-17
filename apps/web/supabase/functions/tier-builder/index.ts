/**
 * VendorShield V2 — Edge Function : tier-builder
 *
 * Génère les fournisseurs probables de Tier 2/3 pour un fournisseur Tier 1
 * via un appel LLM (Groq Llama 3.3).
 *
 * POST /functions/v1/tier-builder
 * Body: { supplier_id, account_id, max_tier?, triggered_by? }
 **/

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(supplier: {
  name: string; category: string; country_name: string | null;
  country_code: string | null; criticality: string;
  annual_spend_eur: number | null;
}): string {
  return `Tu es un expert en supply chain et en cartographie des chaînes d'approvisionnement B2B.

FOURNISSEUR DIRECT (Tier 1) : ${supplier.name}
Secteur : ${supplier.category}
Pays : ${supplier.country_name ?? supplier.country_code ?? 'Inconnu'}
Criticité : ${supplier.criticality}
Dépense annuelle : ${supplier.annual_spend_eur ? Number(supplier.annual_spend_eur).toLocaleString('fr-FR') + ' €' : 'Non renseignée'}

Génère une liste réaliste des fournisseurs typiques de Tier 2 (fournisseurs de notre fournisseur) et Tier 3 (fournisseurs des Tier 2) pour ce type d'entreprise.
Base-toi sur les standards industriels réels du secteur ${supplier.category}.

JSON valide uniquement, sans texte autour :
{
  "tier2": [
    {
      "name": "nom réaliste",
      "category": "raw_materials|components|logistics|services|technology|energy|chemicals|packaging",
      "country_code": "XX",
      "country_name": "Pays",
      "inferred_role": "rôle précis dans la supply chain (ex: Fournisseur de silicium brut)",
      "estimated_risk_level": "low|medium|high|critical",
      "estimated_score": 65,
      "supply_chain_impact": "high|medium|low",
      "is_estimated_sole_source": false,
      "confidence": 80,
      "ai_rationale": "pourquoi ce fournisseur est typique pour ce secteur (1 phrase)"
    }
  ],
  "tier3": [
    {
      "name": "...",
      "category": "...",
      "country_code": "XX",
      "country_name": "...",
      "inferred_role": "...",
      "tier2_parent_name": "nom du Tier 2 parent correspondant",
      "estimated_risk_level": "...",
      "estimated_score": 55,
      "supply_chain_impact": "...",
      "is_estimated_sole_source": false,
      "confidence": 60,
      "ai_rationale": "..."
    }
  ]
}

Règles :
- 4 à 6 nœuds Tier 2 réalistes et distincts
- 3 à 5 nœuds Tier 3 (les plus critiques seulement)
- Noms génériques mais réalistes (pas de vraies entreprises)
- Varier les pays pour refléter la réalité géographique mondiale
- Indiquer is_estimated_sole_source=true si ce type de fournisseur est rare
- Réponds en français pour ai_rationale et inferred_role`;
}

// ─── Mock mode ────────────────────────────────────────────────────────────────

function generateMockTiers(supplier: { name: string; category: string }) {
  const cat = supplier.category;

  const tier2Map: Record<string, unknown[]> = {
    components: [
      { name: 'SiliconRaw Materials GmbH', category: 'raw_materials', country_code: 'DE', country_name: 'Allemagne', inferred_role: 'Fournisseur de silicium et métaux rares', estimated_risk_level: 'medium', estimated_score: 62, supply_chain_impact: 'high', is_estimated_sole_source: false, confidence: 82, ai_rationale: 'Les fabricants de composants électroniques s\'approvisionnent en silicium purifié auprès de spécialistes.' },
      { name: 'ChemPure Substrates Corp.', category: 'chemicals', country_code: 'TW', country_name: 'Taïwan', inferred_role: 'Fabricant de substrats chimiques spéciaux', estimated_risk_level: 'medium', estimated_score: 68, supply_chain_impact: 'high', is_estimated_sole_source: true, confidence: 75, ai_rationale: 'Substrats PCB haut de gamme — marché concentré Asie-Pacifique.' },
      { name: 'PrecisionMachining Europe SRL', category: 'components', country_code: 'IT', country_name: 'Italie', inferred_role: 'Sous-traitant usinage de précision', estimated_risk_level: 'low', estimated_score: 78, supply_chain_impact: 'medium', is_estimated_sole_source: false, confidence: 70, ai_rationale: 'Outillage et pièces usinées pour assemblage composants.' },
      { name: 'MediumFreight Logistics Asia', category: 'logistics', country_code: 'SG', country_name: 'Singapour', inferred_role: 'Opérateur logistique maritime Asie-Europe', estimated_risk_level: 'low', estimated_score: 85, supply_chain_impact: 'medium', is_estimated_sole_source: false, confidence: 78, ai_rationale: 'Transport maritime des composants depuis l\'Asie vers l\'Europe.' },
      { name: 'PackSafe Industrial Ltd.', category: 'packaging', country_code: 'CN', country_name: 'Chine', inferred_role: 'Fabricant emballages industriels ESD', estimated_risk_level: 'high', estimated_score: 42, supply_chain_impact: 'low', is_estimated_sole_source: false, confidence: 65, ai_rationale: 'Emballages antistatiques pour composants sensibles.' },
    ],
    raw_materials: [
      { name: 'GlobalOre Mining Corp.', category: 'raw_materials', country_code: 'AU', country_name: 'Australie', inferred_role: 'Extracteur de minerais métalliques', estimated_risk_level: 'medium', estimated_score: 58, supply_chain_impact: 'high', is_estimated_sole_source: false, confidence: 80, ai_rationale: 'Source primaire de minerais traités par notre fournisseur.' },
      { name: 'ChemRefinery Industries', category: 'chemicals', country_code: 'SA', country_name: 'Arabie Saoudite', inferred_role: 'Raffinage et purification matières premières', estimated_risk_level: 'medium', estimated_score: 55, supply_chain_impact: 'high', is_estimated_sole_source: false, confidence: 72, ai_rationale: 'Traitement chimique des matières brutes avant transformation.' },
      { name: 'AgroInput Supplies Ltd.', category: 'raw_materials', country_code: 'BR', country_name: 'Brésil', inferred_role: 'Fourniture intrants agricoles et engrais', estimated_risk_level: 'medium', estimated_score: 60, supply_chain_impact: 'medium', is_estimated_sole_source: false, confidence: 68, ai_rationale: 'Intrants pour la production agricole à grande échelle.' },
      { name: 'WaterTreat Infra SA', category: 'services', country_code: 'FR', country_name: 'France', inferred_role: 'Traitement et gestion des eaux industrielles', estimated_risk_level: 'low', estimated_score: 80, supply_chain_impact: 'low', is_estimated_sole_source: false, confidence: 60, ai_rationale: 'Infrastructure eau pour sites de production.' },
    ],
    logistics: [
      { name: 'PortAuthority Services GmbH', category: 'services', country_code: 'NL', country_name: 'Pays-Bas', inferred_role: 'Opérateur portuaire et manutention', estimated_risk_level: 'low', estimated_score: 82, supply_chain_impact: 'high', is_estimated_sole_source: false, confidence: 85, ai_rationale: 'Hub logistique Rotterdam critique pour les flux Europe.' },
      { name: 'FuelDepot International', category: 'energy', country_code: 'AE', country_name: 'Émirats', inferred_role: 'Fournisseur carburant flotte transport', estimated_risk_level: 'medium', estimated_score: 62, supply_chain_impact: 'medium', is_estimated_sole_source: false, confidence: 70, ai_rationale: 'Approvisionnement carburant pour flotte de camions.' },
      { name: 'FleetMaintenance Corp.', category: 'services', country_code: 'PL', country_name: 'Pologne', inferred_role: 'Maintenance et réparation flotte poids lourds', estimated_risk_level: 'low', estimated_score: 75, supply_chain_impact: 'medium', is_estimated_sole_source: false, confidence: 72, ai_rationale: 'Maintenance préventive et curative de la flotte.' },
      { name: 'IT-Track Solutions SAS', category: 'technology', country_code: 'FR', country_name: 'France', inferred_role: 'Fournisseur TMS et tracking logistique', estimated_risk_level: 'low', estimated_score: 78, supply_chain_impact: 'low', is_estimated_sole_source: true, confidence: 65, ai_rationale: 'Système de gestion transport (TMS) propriétaire.' },
    ],
  };

  const t2 = tier2Map[cat] ?? tier2Map.components;

  const tier3 = [
    { name: 'RareMetal Mining Ltd.', category: 'raw_materials', country_code: 'CD', country_name: 'Congo RDC', inferred_role: 'Extraction terres rares et métaux stratégiques', tier2_parent_name: t2[0] ? (t2[0] as { name: string }).name : 'Tier 2', estimated_risk_level: 'critical', estimated_score: 22, supply_chain_impact: 'high', is_estimated_sole_source: true, confidence: 55, ai_rationale: 'Terres rares indispensables pour composants high-tech — marché très concentré.' },
    { name: 'EnergyGrid Provider Corp.', category: 'energy', country_code: 'DE', country_name: 'Allemagne', inferred_role: 'Fournisseur électricité industrielle', tier2_parent_name: t2[1] ? (t2[1] as { name: string }).name : 'Tier 2', estimated_risk_level: 'low', estimated_score: 85, supply_chain_impact: 'medium', is_estimated_sole_source: false, confidence: 70, ai_rationale: 'Alimentation électrique des sites de production Tier 2.' },
    { name: 'PackRaw Forestry SA', category: 'raw_materials', country_code: 'FI', country_name: 'Finlande', inferred_role: 'Bois et cellulose pour emballages', tier2_parent_name: t2.length > 4 ? (t2[4] as { name: string }).name : 'Tier 2', estimated_risk_level: 'low', estimated_score: 88, supply_chain_impact: 'low', is_estimated_sole_source: false, confidence: 60, ai_rationale: 'Matières premières pour fabrication d\'emballages.' },
  ];

  return { tier2: t2, tier3 };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
    });
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const groqKey        = Deno.env.get('GROQ_API_KEY') ?? '';
  const mockMode       = Deno.env.get('MOCK_AI') === 'true';
  const supabase       = createClient(supabaseUrl, serviceKey);

  let body: { supplier_id: string; account_id: string; max_tier?: number; triggered_by?: string };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  const { supplier_id, account_id } = body;
  if (!supplier_id || !account_id) return Response.json({ error: 'supplier_id + account_id requis' }, { status: 400 });

  // ── 1. Récupérer le Tier 1 ────────────────────────────────────────────────
  const { data: supplier, error: sErr } = await supabase
    .from('suppliers')
    .select('id,name,category,country_code,country_name,criticality,annual_spend_eur')
    .eq('id', supplier_id)
    .maybeSingle();

  if (sErr || !supplier) return Response.json({ error: 'Fournisseur introuvable' }, { status: 404 });

  // ── 2. Nettoyer les anciens tiers (idempotent) ────────────────────────────
  await supabase.from('supplier_tier_links').delete().eq('from_supplier_id', supplier_id);
  const { data: oldTiers } = await supabase.from('supplier_tiers').select('id').eq('parent_supplier_id', supplier_id);
  if (oldTiers?.length) {
    await supabase.from('supplier_tier_links').delete().in('from_tier_id', oldTiers.map((t: { id: string }) => t.id));
    await supabase.from('supplier_tiers').delete().eq('parent_supplier_id', supplier_id);
  }

  // ── 3. Génération LLM ou mock ─────────────────────────────────────────────
  const runId = crypto.randomUUID();
  let result: { tier2: unknown[]; tier3: unknown[] };

  if (mockMode || !groqKey) {
    await new Promise(r => setTimeout(r, 300));
    result = generateMockTiers(supplier) as { tier2: unknown[]; tier3: unknown[] };
  } else {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Réponds uniquement en JSON valide.' },
          { role: 'user',   content: buildPrompt(supplier) },
        ],
      }),
    });

    if (!res.ok) {
      result = generateMockTiers(supplier) as { tier2: unknown[]; tier3: unknown[] };
    } else {
      const data = await res.json();
      try { result = JSON.parse(data.choices?.[0]?.message?.content ?? '{}'); }
      catch { result = generateMockTiers(supplier) as { tier2: unknown[]; tier3: unknown[] }; }
    }
  }

  // ── 4. Persister Tier 2 ───────────────────────────────────────────────────
  const tier2Rows = (result.tier2 ?? []).map((t: unknown) => {
    const node = t as Record<string, unknown>;
    return {
      account_id, parent_supplier_id: supplier_id, tier_level: 2,
      name:                  String(node.name ?? 'Fournisseur inconnu'),
      category:              String(node.category ?? 'other'),
      country_code:          node.country_code ? String(node.country_code) : null,
      country_name:          node.country_name ? String(node.country_name) : null,
      inferred_role:         node.inferred_role ? String(node.inferred_role) : null,
      estimated_risk_level:  node.estimated_risk_level ? String(node.estimated_risk_level) : 'unknown',
      estimated_score:       typeof node.estimated_score === 'number' ? node.estimated_score : null,
      supply_chain_impact:   node.supply_chain_impact ? String(node.supply_chain_impact) : 'medium',
      is_estimated_sole_source: Boolean(node.is_estimated_sole_source),
      confidence:            typeof node.confidence === 'number' ? node.confidence : 60,
      ai_rationale:          node.ai_rationale ? String(node.ai_rationale) : null,
      model_used:            mockMode ? 'mock' : 'llama-3.3-70b-versatile',
      generation_run_id:     runId,
    };
  });

  const { data: insertedTier2 } = await supabase
    .from('supplier_tiers').insert(tier2Rows).select('id,name');

  // Créer les liens Tier1 → Tier2
  if (insertedTier2?.length) {
    await supabase.from('supplier_tier_links').insert(
      insertedTier2.map((t: { id: string }) => ({
        account_id,
        from_supplier_id: supplier_id,
        to_tier_id:       t.id,
        link_type:        'supplies',
      }))
    );
  }

  // ── 5. Persister Tier 3 ───────────────────────────────────────────────────
  const tier3Inserted: number[] = [];
  const tier2ByName = new Map((insertedTier2 ?? []).map((t: { id: string; name: string }) => [t.name, t.id]));

  const tier3Rows = (result.tier3 ?? []).map((t: unknown) => {
    const node = t as Record<string, unknown>;
    return {
      account_id,
      parent_supplier_id: supplier_id, // le Tier 1 reste le parent racine
      tier_level: 3,
      name:                 String(node.name ?? 'Fournisseur Tier 3'),
      category:             String(node.category ?? 'other'),
      country_code:         node.country_code ? String(node.country_code) : null,
      country_name:         node.country_name ? String(node.country_name) : null,
      inferred_role:        node.inferred_role ? String(node.inferred_role) : null,
      estimated_risk_level: node.estimated_risk_level ? String(node.estimated_risk_level) : 'unknown',
      estimated_score:      typeof node.estimated_score === 'number' ? node.estimated_score : null,
      supply_chain_impact:  node.supply_chain_impact ? String(node.supply_chain_impact) : 'low',
      is_estimated_sole_source: Boolean(node.is_estimated_sole_source),
      confidence:           typeof node.confidence === 'number' ? node.confidence : 50,
      ai_rationale:         node.ai_rationale ? String(node.ai_rationale) : null,
      model_used:           mockMode ? 'mock' : 'llama-3.3-70b-versatile',
      generation_run_id:    runId,
      // Stocker le nom du parent Tier 2 pour le lien
      _tier2_parent_name:   node.tier2_parent_name ? String(node.tier2_parent_name) : null,
    };
  });

  if (tier3Rows.length) {
    const { data: insertedTier3 } = await supabase
      .from('supplier_tiers')
      .insert(tier3Rows.map(({ _tier2_parent_name: _, ...rest }) => rest))
      .select('id');

    // Liens Tier2 → Tier3
    if (insertedTier3?.length) {
      const links = tier3Rows.map((row, i) => {
        const parentId = row._tier2_parent_name ? tier2ByName.get(row._tier2_parent_name) : null;
        return parentId ? {
          account_id,
          from_tier_id: parentId,
          to_tier_id:   insertedTier3[i].id,
          link_type:    'supplies',
        } : null;
      }).filter(Boolean);

      if (links.length) await supabase.from('supplier_tier_links').insert(links);
    }
  }

  return Response.json({
    success:        true,
    supplier_name:  supplier.name,
    tier2_count:    tier2Rows.length,
    tier3_count:    tier3Rows.length,
    generation_run: runId,
    mock_mode:      mockMode || !groqKey,
  });
});
