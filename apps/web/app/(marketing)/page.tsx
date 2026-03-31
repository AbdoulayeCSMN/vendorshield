import Link from 'next/link';

import {
  AlertTriangle,
  ArrowRightIcon,
  BarChart3,
  Bell,
  Building2,
  CheckCircle,
  Globe,
  Shield,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';

import {
  CtaButton,
  FeatureCard,
  FeatureGrid,
  FeatureShowcase,
  FeatureShowcaseIconContainer,
  Hero,
  Pill,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

function Home() {
  return (
    <div className={'mt-4 flex flex-col space-y-24 py-14'}>
      {/* HERO */}
      <div className={'container mx-auto'}>
        <Hero
          pill={
            <Pill label={'Nouveau'}>
              <span>La plateforme de gestion des risques fournisseurs</span>
            </Pill>
          }
          title={
            <>
              <span>Protégez votre chaîne</span>
              <span>d'approvisionnement</span>
            </>
          }
          subtitle={
            <span>
              VendorShield vous permet d'identifier, évaluer et anticiper les
              risques liés à vos fournisseurs — financiers, opérationnels,
              géopolitiques et ESG — en temps réel.
            </span>
          }
          cta={<MainCallToActionButton />}
          image={
            <DashboardPreview />
          }
        />
      </div>

      {/* FEATURES PRINCIPALES */}
      <div className={'container mx-auto'}>
        <div className={'flex flex-col space-y-16 xl:space-y-32 2xl:space-y-36'}>
          <FeatureShowcase
            heading={
              <>
                <b className="font-semibold dark:text-white">
                  Une vue 360° sur vos risques fournisseurs.
                </b>{' '}
                <span className="text-muted-foreground font-normal">
                  Centralisez, scorez et anticipez. Ne soyez plus jamais pris
                  par surprise par la défaillance d'un fournisseur critique.
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <ShieldCheck className="h-5" />
                <span>Couverture complète des risques</span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Score de Risque Global'}
                description={`Chaque fournisseur reçoit un score de risque composite (0–100) calculé automatiquement à partir de 4 dimensions : financière, opérationnelle, géopolitique et ESG.`}
              />

              <FeatureCard
                className={'relative col-span-2 w-full overflow-hidden lg:col-span-1'}
                label={'Alertes Intelligentes'}
                description={`Recevez des alertes en temps réel dès qu'un fournisseur franchit un seuil critique. Configurez vos propres règles de déclenchement.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden lg:col-span-1'}
                label={'Cartographie Géopolitique'}
                description={`Visualisez l'exposition géographique de votre chaîne d'approvisionnement et identifiez les zones de risque pays.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Rapports & Audit Trail'}
                description={`Exportez des rapports de conformité détaillés. Conservez un historique complet de toutes les évaluations pour vos audits internes et réglementaires.`}
              />
            </FeatureGrid>
          </FeatureShowcase>
        </div>
      </div>

      {/* 4 DIMENSIONS DE RISQUE */}
      <div className={'container mx-auto'}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            4 dimensions de risque couvertes
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Une évaluation multicritères exhaustive pour ne manquer aucun signal d'alerte.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <RiskDimensionCard
            icon={<TrendingUp className="h-8 w-8 text-blue-500" />}
            title="Financier"
            color="blue"
            items={[
              'Solvabilité & notation',
              'Délais de paiement',
              'Santé bilancielle',
              'Dépendance CA',
            ]}
          />
          <RiskDimensionCard
            icon={<Zap className="h-8 w-8 text-orange-500" />}
            title="Opérationnel"
            color="orange"
            items={[
              'Continuité de service',
              'Concentration fournisseur',
              'Qualité & certifications',
              'Capacité de substitution',
            ]}
          />
          <RiskDimensionCard
            icon={<Globe className="h-8 w-8 text-purple-500" />}
            title="Géopolitique"
            color="purple"
            items={[
              'Risque pays',
              'Sanctions & embargos',
              'Instabilité régionale',
              'Dépendances critiques',
            ]}
          />
          <RiskDimensionCard
            icon={<Shield className="h-8 w-8 text-green-500" />}
            title="Conformité / ESG"
            color="green"
            items={[
              'Devoir de vigilance',
              'Empreinte carbone',
              'Pratiques sociales',
              'Gouvernance & éthique',
            ]}
          />
        </div>
      </div>

      {/* SOCIAL PROOF / STATS */}
      <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl py-16">
        <div className={'container mx-auto'}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard value="< 5 min" label="Pour évaluer un fournisseur" />
            <StatCard value="4 axes" label="De risque couverts" />
            <StatCard value="100+" label="Critères d'évaluation" />
            <StatCard value="temps réel" label="Alertes & surveillance" />
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className={'container mx-auto text-center'}>
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          Prêt à sécuriser votre supply chain ?
        </h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
          Commencez gratuitement. Aucune carte de crédit requise.
        </p>
        <div className="flex justify-center gap-4">
          <CtaButton>
            <Link href="/auth/sign-up">
              <span className="flex items-center gap-2">
                Démarrer gratuitement
                <ArrowRightIcon className="h-4 animate-in fade-in slide-in-from-left-8 zoom-in fill-mode-both delay-1000 duration-1000" />
              </span>
            </Link>
          </CtaButton>
          <CtaButton variant="outline">
            <Link href="/auth/sign-in">Se connecter</Link>
          </CtaButton>
        </div>
      </div>
    </div>
  );
}

export default withI18n(Home);

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-4'}>
      <CtaButton>
        <Link href={'/auth/sign-up'}>
          <span className={'flex items-center space-x-2'}>
            <span>Démarrer gratuitement</span>
            <ArrowRightIcon className={'h-4 animate-in fade-in slide-in-from-left-8 zoom-in fill-mode-both delay-1000 duration-1000'} />
          </span>
        </Link>
      </CtaButton>
      <CtaButton variant={'outline'}>
        <Link href={'/auth/sign-in'}>Se connecter</Link>
      </CtaButton>
    </div>
  );
}

function RiskDimensionCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-primary mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
      {/* Fake browser chrome */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="mx-auto text-xs text-gray-400 font-mono bg-white dark:bg-gray-700 rounded-full px-3 py-0.5">
          app.vendorshield.io/home
        </div>
      </div>
      {/* Dashboard mock */}
      <div className="p-6 bg-gray-50 dark:bg-gray-950">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MiniKPICard label="Fournisseurs" value="47" color="blue" />
          <MiniKPICard label="Alertes actives" value="3" color="red" />
          <MiniKPICard label="Score moyen" value="72" color="green" />
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs font-semibold text-gray-500 mb-3">FOURNISSEURS À RISQUE ÉLEVÉ</div>
          {[
            { name: 'Acier Pro SARL', score: 28, risk: 'Élevé', country: '🇨🇳' },
            { name: 'LogiTrans SA', score: 41, risk: 'Moyen', country: '🇹🇷' },
            { name: 'ChimFlex Inc.', score: 35, risk: 'Élevé', country: '🇷🇺' },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{s.country}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.score < 35
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {s.risk}
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{s.score}/100</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniKPICard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    red: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300',
    green: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
  };
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}
