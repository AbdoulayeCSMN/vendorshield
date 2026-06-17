import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { disableDemoMode } from '~/lib/vendorshield/demo';

export async function GET(request: Request) {
  // Termine la session démo (compte partagé) et nettoie le cookie.
  const client = getSupabaseServerClient();
  await client.auth.signOut();

  const response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
  disableDemoMode(response);
  return response;
}
