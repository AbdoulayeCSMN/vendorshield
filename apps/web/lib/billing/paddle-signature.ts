import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Vérifie la signature d'un webhook Paddle.
 * Header `Paddle-Signature`: `ts=<unix>;h1=<hex hmac-sha256>`.
 * Payload signé = `${ts}:${rawBody}`, clé = secret du endpoint (Dashboard
 * Paddle → Developer tools → Notifications → [endpoint] → secret key).
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(';').map((p) => p.split('=') as [string, string]),
  );
  const timestamp = parts.ts;
  const expected = parts.h1;

  if (!timestamp || !expected) return false;

  const signedPayload = `${timestamp}:${rawBody}`;
  const computed = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const computedBuf = Buffer.from(computed, 'hex');

  if (expectedBuf.length !== computedBuf.length) return false;

  return timingSafeEqual(expectedBuf, computedBuf);
}
