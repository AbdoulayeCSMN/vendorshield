import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { enableDemoMode } from '~/lib/vendorshield/demo';

/**
 * Démo publique : connecte automatiquement un compte de démonstration seedé
 * (lecture seule via le garde-fou des Server Actions) puis ouvre le dashboard.
 *
 * Identifiants REQUIS : DEMO_EMAIL / DEMO_PASSWORD. Sans eux, la démo est
 * désactivée — on ne retombe JAMAIS sur le compte seedé (test@makerkit.dev).
 */
export async function GET(request: Request) {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  // Démo non configurée → on n'expose aucun compte, on renvoie vers l'inscription.
  if (!email || !password) {
    return NextResponse.redirect(new URL('/auth/sign-up', request.url));
  }

  const client = getSupabaseServerClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[demo] connexion compte démo échouée:', error.message);
    const url = new URL('/auth/sign-in', request.url);
    url.searchParams.set('demo_error', '1');
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(new URL('/home', request.url));
  enableDemoMode(response);
  return response;
}
