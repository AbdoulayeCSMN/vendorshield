'use server';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  type ClimateAssessment,
  assessClimate,
} from '~/lib/vendorshield/climate.server';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Évalue le risque de disruption climatique d'un fournisseur à partir de sa
 * localisation (ville / pays) et des prévisions Open-Meteo.
 */
export async function assessSupplierClimateAction(
  supplierId: string,
): Promise<ActionResult<ClimateAssessment>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: supplier } = await (client as any)
    .from('suppliers')
    .select('city, country_name, country_code')
    .eq('id', supplierId)
    .maybeSingle();

  if (!supplier) return { success: false, error: 'Fournisseur introuvable' };

  if (!supplier.city && !supplier.country_name && !supplier.country_code) {
    return {
      success: false,
      error: 'Localisation manquante pour ce fournisseur (ville ou pays).',
    };
  }

  const assessment = await assessClimate(
    supplier.city,
    supplier.country_name,
    supplier.country_code,
  );

  if (!assessment) {
    return {
      success: false,
      error: 'Localisation introuvable ou service météo indisponible.',
    };
  }

  return { success: true, data: assessment };
}
