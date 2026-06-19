'use client';

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
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="mb-4 flex w-full flex-wrap justify-start">
        <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
        <TabsTrigger value="risk">Risque &amp; prédictions</TabsTrigger>
        <TabsTrigger value="compliance">Conformité</TabsTrigger>
        <TabsTrigger value="actions">Actions</TabsTrigger>
        <TabsTrigger value="network">Supply chain</TabsTrigger>
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
