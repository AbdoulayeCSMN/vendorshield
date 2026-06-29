import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:refundPolicy'),
  };
}

async function RefundPolicyPage() {
  const { t } = await createI18nServerInstance();
  const l = (key: string) => t(`legal:refund.${key}`);

  return (
    <div>
      <SitePageHeader
        title={t('marketing:refundPolicy')}
        subtitle={t('marketing:refundPolicyDescription')}
      />

      <div className={'container mx-auto max-w-3xl space-y-8 py-8'}>
        <p className="text-muted-foreground text-sm">{t('legal:lastUpdated')}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s1Heading')}</h2>
          <p>{l('s1Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s2Heading')}</h2>
          <p>
            {l('s2Before')} <strong>{l('s2Bold')}</strong> {l('s2After')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s3Heading')}</h2>
          <p>
            {l('s3Before')}
            <code>{l('s3Code')}</code>
            {l('s3After')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s4Heading')}</h2>
          <p>{l('s4Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s5Heading')}</h2>
          <p>
            {l('s5Before')} <strong>{l('s5Bold')}</strong>
            {l('s5After')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s6Heading')}</h2>
          <p>
            {l('s6Before')}{' '}
            <a href="mailto:a.chaibou.tech@gmail.com" className="underline">
              a.chaibou.tech@gmail.com
            </a>{' '}
            {l('s6After')}
          </p>
        </section>
      </div>
    </div>
  );
}

export default withI18n(RefundPolicyPage);
