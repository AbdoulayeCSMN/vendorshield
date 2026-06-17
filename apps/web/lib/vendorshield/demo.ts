import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const DEMO_MODE_COOKIE = 'vs-demo-mode';

export const DEMO_READONLY_MESSAGE =
  'Action désactivée en mode démo (lecture seule). Créez un compte pour débloquer toutes les fonctionnalités.';

export async function isDemoMode(): Promise<boolean> {
  const store = await cookies();

  return store.get(DEMO_MODE_COOKIE)?.value === 'true';
}

/**
 * Garde-fou pour les Server Actions : retourne un ActionResult d'erreur si la
 * session est en mode démo (lecture seule), sinon `null` (poursuivre).
 */
export async function denyIfDemo(): Promise<{
  success: false;
  error: string;
} | null> {
  if (await isDemoMode()) {
    return { success: false, error: DEMO_READONLY_MESSAGE };
  }
  return null;
}

export function enableDemoMode(response: NextResponse) {
  response.cookies.set(DEMO_MODE_COOKIE, 'true', {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function disableDemoMode(response: NextResponse) {
  response.cookies.set(DEMO_MODE_COOKIE, 'false', {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 0,
  });
}