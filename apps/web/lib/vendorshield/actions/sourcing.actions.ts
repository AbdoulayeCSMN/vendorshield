'use server';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  getMultiSourcingRecommendations,
  type SourcingRecommendation,
} from '~/lib/vendorshield/multi-sourcing.server';

type AdviceResult =
  | { success: true; advice: string }
  | { success: false; error: string };

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', style: 'currency', currency: 'EUR' }).format(n);

async function llmComplete(system: string, user: string): Promise<string | null> {
  const body = (model: string) =>
    JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

  const call = async (url: string, key: string, model: string) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: body(model),
      });
      if (!res.ok) return null;
      const d = await res.json();
      return (d.choices?.[0]?.message?.content as string) ?? null;
    } catch {
      return null;
    }
  };

  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    const r = await call('https://api.groq.com/openai/v1/chat/completions', groq, 'llama-3.3-70b-versatile');
    if (r) return r;
  }
  const or = process.env.OPENROUTER_API_KEY;
  if (or) {
    const r = await call('https://openrouter.ai/api/v1/chat/completions', or, 'meta-llama/llama-3.3-70b-instruct:free');
    if (r) return r;
  }
  return null;
}

function factLine(r: SourcingRecommendation): string {
  return `- ${r.supplier_name} — catégorie « ${r.category ?? '—'} », criticité ${r.criticality ?? '—'}, risque ${r.risk_level ?? '—'}, dépense ${eur(r.spend)}, ${r.is_sole_source ? 'MONO-SOURCE' : 'multi-source'}, ${r.alternatives_count} alternative(s) qualifiée(s)${r.alternatives.length ? ` (ex: ${r.alternatives.map((a) => a.name).join(', ')})` : ''}`;
}

/** Génère un plan de diversification narratif (markdown) à partir des faits du moteur. */
export async function sourcingAdviceAction(): Promise<AdviceResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const data = await getMultiSourcingRecommendations();
  if (data.count === 0) {
    return {
      success: true,
      advice:
        'Aucune dépendance critique détectée : votre portefeuille semble correctement diversifié. Maintenez un suivi régulier des fournisseurs critiques.',
    };
  }

  const facts = data.recommendations.slice(0, 14).map(factLine).join('\n');
  const singles = data.single_supplier_categories
    .slice(0, 8)
    .map((c) => `- « ${c.category} » : ${eur(c.spend)} sur un seul fournisseur`)
    .join('\n');

  const advice = await llmComplete(
    "Tu es un expert achats et supply chain. À partir UNIQUEMENT des faits fournis, rédige un plan d'action de diversification (multi-sourcing) en français, concis et priorisé. Format markdown : une phrase d'introduction, puis une liste à puces d'actions concrètes (qualifier une 2ᵉ source, répartir le volume, etc.), de la plus urgente à la moins urgente. N'invente aucun fournisseur ni chiffre absent des faits.",
    `Fournisseurs à risque de dépendance (${data.count}), dépense exposée ≈ ${eur(data.exposed_spend)} :\n${facts}\n\nCatégories à fournisseur unique :\n${singles || '- aucune'}`,
  );

  if (!advice) {
    return {
      success: false,
      error: 'Service de conseil indisponible (LLM). Les recommandations factuelles restent affichées ci-dessous.',
    };
  }

  return { success: true, advice };
}
