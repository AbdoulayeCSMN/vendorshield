import { NextResponse } from 'next/server';

import { enableDemoMode } from '~/lib/vendorshield/demo';

export async function GET(request: Request) {
  const url = new URL('/home', request.url);
  const response = NextResponse.redirect(url);

  enableDemoMode(response);

  return response;
}