'use client';

import { useEffect, useState } from 'react';

import { LanguageSelector } from '@kit/ui/language-selector';

/**
 * Enveloppe client-only du sélecteur de langue. Le composant Radix Select
 * utilise `useId` ; rendu pendant le SSR il provoque un mismatch d'hydratation
 * (IDs serveur ≠ client). On ne le rend qu'après montage : le serveur et le
 * premier rendu client affichent un placeholder de même hauteur → pas de
 * décalage des IDs Radix voisins (thème, menu compte).
 */
export function LanguageSwitcher() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-full" aria-hidden />;

  return <LanguageSelector />;
}
