'use client';

import Link from 'next/link';

import { FileQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

export default function HomeNotFound() {
  const { t } = useTranslation('vendorshield');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <FileQuestion className="text-muted-foreground h-12 w-12" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('pages.notFound')}</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          {t('pages.notFoundDesc')}
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/home/suppliers">{t('pages.suppliers')}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/home">{t('pages.dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
