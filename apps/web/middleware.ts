import type { NextRequest } from 'next/server';
import { NextResponse, URLPattern } from 'next/server';

import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';

import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import { createMiddlewareClient } from '@kit/supabase/middleware-client';

import appConfig from '~/config/app.config';
import pathsConfig from '~/config/paths.config';

const CSRF_SECRET_COOKIE = 'csrfSecret';
const NEXT_ACTION_HEADER = 'next-action';

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};

const getUser = async (request: NextRequest, response: NextResponse) => {
  try {
    const supabase = createMiddlewareClient(request, response);
    return await supabase.auth.getClaims();
  } catch (error) {
    // Network or auth refresh failures in edge runtime should not crash middleware.
    console.error('[middleware] Supabase getClaims failed:', error);
    return { data: null, error: null } as const;
  }
};

const DEMO_MODE_COOKIE = 'vs-demo-mode';

/**
 * Removes a stale `vs-demo-mode` cookie when the authenticated user is NOT the
 * demo account. Without this, a visitor who opened /demo (cookie set) and then
 * signed up with a real account stays stuck in read-only mode.
 */
async function clearStaleDemoCookie(
  request: NextRequest,
  response: NextResponse,
) {
  if (request.cookies.get(DEMO_MODE_COOKIE)?.value !== 'true') {
    return;
  }

  try {
    const { data } = await getUser(request, response);
    // getClaims() returns the JWT payload (directly or nested under `claims`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claims = ((data as any)?.claims ?? data) as { email?: string } | null;
    const email = claims?.email?.toLowerCase();

    // not authenticated → genuine demo browsing, keep the cookie
    if (!email) {
      return;
    }

    const demoEmail = process.env.DEMO_EMAIL?.toLowerCase();
    const isDemoAccount = !!demoEmail && email === demoEmail;

    // a real (non-demo) user carries a stale demo cookie → remove it
    if (!isDemoAccount) {
      response.cookies.set(DEMO_MODE_COOKIE, '', { path: '/', maxAge: 0 });
    }
  } catch {
    // best-effort cleanup — never break navigation
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // set a unique request ID for each request
  // this helps us log and trace requests
  setRequestId(request);

  // apply CSRF protection for mutating requests
  const csrfResponse = await withCsrfMiddleware(request, response);

  // clear a stale demo cookie when a real (non-demo) user is authenticated, so
  // visitors who tried /demo then signed up aren't stuck in read-only mode
  await clearStaleDemoCookie(request, csrfResponse);

  // handle patterns for specific routes
  const handlePattern = matchUrlPattern(request.url);

  // if a pattern handler exists, call it
  if (handlePattern) {
    const patternHandlerResponse = await handlePattern(request, csrfResponse);

    // if a pattern handler returns a response, return it
    if (patternHandlerResponse) {
      return patternHandlerResponse;
    }
  }

  // append the action path to the request headers
  // which is useful for knowing the action path in server actions
  if (isServerAction(request)) {
    csrfResponse.headers.set('x-action-path', request.nextUrl.pathname);
  }

  // if no pattern handler returned a response,
  // return the session response
  return csrfResponse;
}

async function withCsrfMiddleware(
  request: NextRequest,
  response = new NextResponse(),
) {
  // set up CSRF protection
  const csrfProtect = createCsrfProtect({
    cookie: {
      secure: appConfig.production,
      name: CSRF_SECRET_COOKIE,
    },
    // ignore CSRF errors for server actions since protection is built-in
    ignoreMethods: isServerAction(request)
      ? ['POST']
      : // always ignore GET, HEAD, and OPTIONS requests
        ['GET', 'HEAD', 'OPTIONS'],
  });

  try {
    await csrfProtect(request, response);

    return response;
  } catch (error) {
    // if there is a CSRF error, return a 403 response
    if (error instanceof CsrfError) {
      return NextResponse.json('Invalid CSRF token', {
        status: 401,
      });
    }

    throw error;
  }
}

function isServerAction(request: NextRequest) {
  const headers = new Headers(request.headers);

  return headers.has(NEXT_ACTION_HEADER);
}
/**
 * Define URL patterns and their corresponding handlers.
 */
function getPatterns() {
  return [
    {
      pattern: new URLPattern({ pathname: '/auth/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const { data } = await getUser(req, res);

        // the user is logged out, so we don't need to do anything
        if (!data?.claims) {
          return;
        }

        // check if we need to verify MFA (user is authenticated but needs to verify MFA)
        const isVerifyMfa = req.nextUrl.pathname === pathsConfig.auth.verifyMfa;

        // If user is logged in and does not need to verify MFA,
        // redirect to home page.
        if (!isVerifyMfa) {
          return NextResponse.redirect(
            new URL(pathsConfig.app.home, req.nextUrl.origin).href,
          );
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: '/home/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const { data } = await getUser(req, res);

        const origin = req.nextUrl.origin;
        const next = req.nextUrl.pathname;

        // If user is not logged in, redirect to sign in page.
        if (!data?.claims) {
          const signIn = pathsConfig.auth.signIn;
          const redirectPath = `${signIn}?next=${next}`;

          return NextResponse.redirect(new URL(redirectPath, origin).href);
        }

        const supabase = createMiddlewareClient(req, res);

        let requiresMultiFactorAuthentication = false;
        try {
          requiresMultiFactorAuthentication =
            await checkRequiresMultiFactorAuthentication(supabase);
        } catch (error) {
          // If MFA check fails because auth backend is temporarily unreachable,
          // avoid throwing 500 from middleware.
          console.error('[middleware] MFA check failed:', error);
          requiresMultiFactorAuthentication = false;
        }

        // If user requires multi-factor authentication, redirect to MFA page.
        if (requiresMultiFactorAuthentication) {
          return NextResponse.redirect(
            new URL(pathsConfig.auth.verifyMfa, origin).href,
          );
        }
      },
    },
  ];
}

/**
 * Match URL patterns to specific handlers.
 * @param url
 */
function matchUrlPattern(url: string) {
  const patterns = getPatterns();
  const input = url.split('?')[0];

  for (const pattern of patterns) {
    const patternResult = pattern.pattern.exec(input);

    if (patternResult !== null && 'pathname' in patternResult) {
      return pattern.handler;
    }
  }
}

/**
 * Set a unique request ID for each request.
 * @param request
 */
function setRequestId(request: Request) {
  request.headers.set('x-correlation-id', crypto.randomUUID());
}
