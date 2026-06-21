import Link from 'next/link';

import { SignInMethodsContainer } from '@kit/auth/sign-in';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signIn'),
  };
};

const paths = {
  callback: pathsConfig.auth.callback,
  home: pathsConfig.app.home,
};

function SignInPage() {
  const demoEnabled = !!process.env.DEMO_EMAIL && !!process.env.DEMO_PASSWORD;

  return (
    <>
      <Heading level={5} className={'tracking-tight'}>
        <Trans i18nKey={'auth:signInHeading'} />
      </Heading>

      <SignInMethodsContainer paths={paths} providers={authConfig.providers} />

      <div className={'flex justify-center'}>
        <Button asChild variant={'link'} size={'sm'}>
          <Link href={pathsConfig.auth.signUp}>
            <Trans i18nKey={'auth:doNotHaveAccountYet'} />
          </Link>
        </Button>
      </div>

      {demoEnabled && (
        <div className={'flex flex-col items-center gap-1 border-t pt-4'}>
          <p className={'text-muted-foreground text-xs'}>
            Pas envie de créer un compte tout de suite ?
          </p>
          <Button asChild variant={'outline'} size={'sm'}>
            <Link href={'/demo'}>🚀 Explorer la démo (sans inscription)</Link>
          </Button>
        </div>
      )}
    </>
  );
}

export default withI18n(SignInPage);
