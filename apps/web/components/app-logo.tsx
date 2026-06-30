import Link from 'next/link';

import { cn } from '@kit/ui/utils';

import { BrandMark } from './brand-mark';

function LogoImage({ className }: { className?: string; width?: number }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BrandMark className="h-[30px] w-[30px]" />
      <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Avi<span className="text-primary">lyre</span>
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
    <Link aria-label={label ?? 'Avilyre - Accueil'} href={href ?? '/'}>
      <LogoImage className={className} />
    </Link>
  );
}
