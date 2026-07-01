'use client';

import Link from 'next/link';

import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation('vendorshield');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('common.errorTitle')}</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          {t('common.errorDesc')}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => reset()}>
          {t('common.retry')}
        </Button>
        <Button asChild size="sm">
          <Link href="/home">{t('pages.dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
