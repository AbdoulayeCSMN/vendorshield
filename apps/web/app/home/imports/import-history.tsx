'use client';

import { useTranslation } from 'react-i18next';

export function ImportHistory() {
  const { t } = useTranslation('vendorshield');
  return (
    <div className="text-center py-8 text-gray-600">
      <p className="text-sm">{t('imports.noRecent')}</p>
    </div>
  );
}
