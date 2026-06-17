import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const DEMO_MODE_COOKIE = 'vs-demo-mode';

export async function isDemoMode(): Promise<boolean> {
  const store = await cookies();

  return store.get(DEMO_MODE_COOKIE)?.value === 'true';
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