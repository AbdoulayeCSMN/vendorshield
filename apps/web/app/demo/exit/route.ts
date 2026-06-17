import { NextResponse } from 'next/server';

import { disableDemoMode } from '~/lib/vendorshield/demo';

export async function GET(request: Request) {
  const url = new URL('/home', request.url);
  const response = NextResponse.redirect(url);

  disableDemoMode(response);

  return response;
}