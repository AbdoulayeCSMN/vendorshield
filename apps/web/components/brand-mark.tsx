import { cn } from '@kit/ui/utils';

/**
 * Marque VendorShield : un « V » dans un bouclier.
 * Bouclier en couleur primaire (s'adapte au thème) ; le V contraste
 * automatiquement (blanc en clair, sombre en sombre). `className` règle la
 * taille (ex: "h-8 w-8").
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="VendorShield"
      className={cn('h-8 w-8 shrink-0', className)}
    >
      <path
        d="M16 2L4 7V15C4 21.627 9.373 27.627 16 30C22.627 27.627 28 21.627 28 15V7L16 2Z"
        className="fill-primary"
      />
      <path
        d="M10.5 11L16 21.5L21.5 11"
        className="stroke-white dark:stroke-neutral-900"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
