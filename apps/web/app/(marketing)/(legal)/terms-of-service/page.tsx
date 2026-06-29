import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:termsOfService'),
  };
}

async function TermsOfServicePage() {
  const { t } = await createI18nServerInstance();
  const l = (key: string) => t(`legal:terms.${key}`);

  return (
    <div>
      <SitePageHeader
        title={t(`marketing:termsOfService`)}
        subtitle={t(`marketing:termsOfServiceDescription`)}
      />

      <div className={'container mx-auto max-w-3xl space-y-8 py-8'}>
        <p className="text-muted-foreground text-sm">{t('legal:lastUpdated')}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s1Heading')}</h2>
          <p>{l('s1Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s2Heading')}</h2>
          <p>{l('s2Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s3Heading')}</h2>
          <p>{l('s3Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s4Heading')}</h2>
          <p>{l('s4Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s5Heading')}</h2>
          <p>{l('s5Body1')}</p>
          <p>
            {l('s5Body2Before')} <strong>{l('s5Body2Bold')}</strong>
            {l('s5Body2Middle')}
            <a
              href="https://www.paddle.com/legal/checkout-buyer-terms"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {l('s5Body2LinkText')}
            </a>
            {l('s5Body2After')}
          </p>
          <p>
            {l('s5Body3Before')}{' '}
            <a href="/refund-policy" className="underline">
              {l('s5Body3LinkText')}
            </a>{' '}
            {l('s5Body3After')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s6Heading')}</h2>
          <p>{l('s6Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s7Heading')}</h2>
          <p>{l('s7Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s8Heading')}</h2>
          <p>
            {l('s8Before')}{' '}
            <a href="/privacy-policy" className="underline">
              {l('s8LinkText')}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s9Heading')}</h2>
          <p>{l('s9Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s10Heading')}</h2>
          <p>{l('s10Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s11Heading')}</h2>
          <p>{l('s11Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s12Heading')}</h2>
          <p>
            {l('s12Before')}{' '}
            <a href="mailto:a.chaibou.tech@gmail.com" className="underline">
              a.chaibou.tech@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

export default withI18n(TermsOfServicePage);
