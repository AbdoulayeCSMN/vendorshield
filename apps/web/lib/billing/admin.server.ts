import 'server-only';

/**
 * Pas de système de rôles dédié dans l'app (chaque compte est son propre
 * tenant) : on autorise l'activation manuelle d'abonnement à une liste
 * d'emails en dur côté serveur, pour le founder uniquement.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowList = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(email.toLowerCase());
}
