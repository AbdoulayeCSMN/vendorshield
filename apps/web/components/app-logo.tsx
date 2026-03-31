import Link from 'next/link';

import { cn } from '@kit/ui/utils';

function LogoImage({ className }: { className?: string; width?: number }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M16 2L4 7V15C4 21.627 9.373 27.627 16 30C22.627 27.627 28 21.627 28 15V7L16 2Z"
          className="fill-primary"
        />
        <path
          d="M11 16l3.5 3.5L21 12"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Vendor<span className="text-primary">Shield</span>
      </span>
    </div>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'VendorShield - Accueil'} href={href ?? '/'}>
      <LogoImage className={className} />
    </Link>
  );
}
