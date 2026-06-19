'use client';

import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

export function SupplierTabs({
  overview,
  risk,
  compliance,
  network,
  actions,
}: {
  overview: React.ReactNode;
  risk: React.ReactNode;
  compliance: React.ReactNode;
  network: React.ReactNode;
  actions: React.ReactNode;
}) {
  const { t } = useTranslation('vendorshield');
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="mb-4 flex w-full flex-wrap justify-start">
        <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
        <TabsTrigger value="risk">{t('tabs.risk')}</TabsTrigger>
        <TabsTrigger value="compliance">{t('tabs.compliance')}</TabsTrigger>
        <TabsTrigger value="actions">{t('tabs.actions')}</TabsTrigger>
        <TabsTrigger value="network">{t('tabs.network')}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {overview}
      </TabsContent>
      <TabsContent value="risk">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{risk}</div>
      </TabsContent>
      <TabsContent value="compliance">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{compliance}</div>
      </TabsContent>
      <TabsContent value="actions">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{actions}</div>
      </TabsContent>
      <TabsContent value="network">{network}</TabsContent>
    </Tabs>
  );
}
