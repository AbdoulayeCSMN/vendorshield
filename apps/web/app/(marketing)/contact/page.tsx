import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ContactForm } from './_components/contact-form';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:contact'),
  };
}

async function ContactPage() {
  const { t } = await createI18nServerInstance();

  return (
    <div className={'flex flex-col space-y-4 xl:space-y-8'}>
      <SitePageHeader
        title={t('marketing:contactHeading')}
        subtitle={t('marketing:contactSubheading')}
      />

      <div className={'container mx-auto pb-16'}>
        <ContactForm />
      </div>
    </div>
  );
}

export default withI18n(ContactPage);
