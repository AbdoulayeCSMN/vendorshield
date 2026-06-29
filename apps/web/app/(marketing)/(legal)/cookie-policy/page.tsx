import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:cookiePolicy'),
  };
}

async function CookiePolicyPage() {
  const { t } = await createI18nServerInstance();
  const l = (key: string) => t(`legal:cookies.${key}`);
  const items = (key: string) =>
    t(`legal:cookies.${key}`, { returnObjects: true }) as string[];

  return (
    <div>
      <SitePageHeader
        title={t(`marketing:cookiePolicy`)}
        subtitle={t(`marketing:cookiePolicyDescription`)}
      />

      <div className={'container mx-auto max-w-3xl space-y-8 py-8'}>
        <p className="text-muted-foreground text-sm">{t('legal:lastUpdated')}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s1Heading')}</h2>
          <p>{l('s1Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{l('s2Heading')}</h2>
          <p>{l('s2Intro')}</p>
          <ul className="list-disc space-y-1 pl-6">
            {items('s2Items').map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
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
          <p>
            {l('s5Before')}{' '}
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

export default withI18n(CookiePolicyPage);
