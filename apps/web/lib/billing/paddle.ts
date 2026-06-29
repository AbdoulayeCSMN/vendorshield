import 'server-only';

/**
 * Client Paddle Billing (REST, sans SDK) — Paddle est un Merchant of Record :
 * pas de notion de "compte connecté", l'app appelle directement l'API avec
 * une clé serveur. Sandbox et Production utilisent des hôtes différents.
 */

function apiBaseUrl(): string {
  return process.env.PADDLE_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com';
}

function apiKey(): string {
  const key = process.env.PADDLE_API_KEY;

  if (!key) {
    throw new Error(
      'PADDLE_API_KEY manquante. Ajoutez-la dans .env.local (Dashboard Paddle → Developer tools → Authentication).',
    );
  }

  return key;
}

async function paddleFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      json?.error?.detail ?? `Paddle API error (HTTP ${res.status})`,
    );
  }

  return json as T;
}

export interface PaddleCustomer {
  id: string;
  email: string;
}

export async function createPaddleCustomer(
  email: string,
  accountId: string,
): Promise<PaddleCustomer> {
  const result = await paddleFetch<{ data: PaddleCustomer }>('/customers', {
    method: 'POST',
    body: JSON.stringify({ email, custom_data: { account_id: accountId } }),
  });

  return result.data;
}

/** Paddle refuse deux clients avec le même email — on cherche d'abord
 * l'existant (ex. créé par une tentative précédente jamais persistée côté
 * app) avant d'en créer un nouveau. */
export async function findPaddleCustomerByEmail(
  email: string,
): Promise<PaddleCustomer | null> {
  const result = await paddleFetch<{ data: PaddleCustomer[] }>(
    `/customers?email=${encodeURIComponent(email)}`,
  );

  return result.data[0] ?? null;
}

/** Idempotent : réutilise le client Paddle existant pour cet email, sinon
 * en crée un. Gère aussi le cas de course (deux requêtes concurrentes) où
 * Paddle renvoie une erreur "customer email conflicts with customer of id
 * ctm_xxx" — on récupère alors l'id annoncé dans le message d'erreur. */
export async function findOrCreatePaddleCustomer(
  email: string,
  accountId: string,
): Promise<PaddleCustomer> {
  const existing = await findPaddleCustomerByEmail(email);
  if (existing) return existing;

  try {
    return await createPaddleCustomer(email, accountId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const match = /customer of id (ctm_[a-z0-9_]+)/i.exec(message);
    const conflictingId = match?.[1];

    if (conflictingId) {
      return getPaddleCustomer(conflictingId);
    }

    throw error;
  }
}

export interface PaddleTransaction {
  id: string;
  checkout: { url: string | null };
}

export async function createPaddleSubscriptionTransaction(params: {
  priceId: string;
  customerId: string;
  accountId: string;
  returnUrl: string;
}): Promise<PaddleTransaction> {
  const result = await paddleFetch<{ data: PaddleTransaction }>(
    '/transactions',
    {
      method: 'POST',
      body: JSON.stringify({
        items: [{ price_id: params.priceId, quantity: 1 }],
        customer_id: params.customerId,
        collection_mode: 'automatic',
        custom_data: { account_id: params.accountId },
        checkout: { url: params.returnUrl },
      }),
    },
  );

  return result.data;
}

export async function getPaddleCustomer(
  customerId: string,
): Promise<PaddleCustomer> {
  const result = await paddleFetch<{ data: PaddleCustomer }>(
    `/customers/${customerId}`,
  );

  return result.data;
}

export async function createPaddlePortalSession(
  customerId: string,
): Promise<string> {
  const result = await paddleFetch<{
    data: { urls: { general: { overview: string } } };
  }>(`/customers/${customerId}/portal-sessions`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  return result.data.urls.general.overview;
}
