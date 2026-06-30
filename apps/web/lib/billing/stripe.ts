import 'server-only';

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Client Stripe singleton côté serveur. Lance une erreur explicite si la clé
 * n'est pas configurée (plutôt que d'échouer silencieusement).
 */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY manquante. Ajoutez-la dans .env.local (Stripe Dashboard → Developers → API keys).',
    );
  }

  stripeClient = new Stripe(secretKey, {
    // On laisse la version d'API par défaut du SDK pour éviter les décalages.
    typescript: true,
    appInfo: { name: 'Avilyre' },
  });

  return stripeClient;
}
