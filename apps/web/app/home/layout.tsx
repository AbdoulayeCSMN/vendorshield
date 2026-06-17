import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { isDemoMode } from '~/lib/vendorshield/demo';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// home imports
import { HomeMenuNavigation } from './_components/home-menu-navigation';
import { DemoModeBanner } from './_components/demo-mode-banner';
import { HomeMobileNavigation } from './_components/home-mobile-navigation';
import { HomeSidebar } from './_components/home-sidebar';

// ─── Layout principal — async, pas de use() ───────────────────────────────────

async function HomeLayout({ children }: React.PropsWithChildren) {
  const cookieStore = await cookies();
  const demoMode = await isDemoMode();
  const style =
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    navigationConfig.style;

  if (style === 'sidebar') {
    return <SidebarLayout demoMode={demoMode}>{children}</SidebarLayout>;
  }

  return <HeaderLayout demoMode={demoMode}>{children}</HeaderLayout>;
}

export default withI18n(HomeLayout);

// ─── SidebarLayout — async ────────────────────────────────────────────────────

async function SidebarLayout({
  children,
  demoMode,
}: React.PropsWithChildren<{ demoMode: boolean }>) {
  const [user] = await Promise.all([requireUserInServerComponent()]);

  // Guard onboarding — import dynamique pour éviter tout conflit de module
  const { getSupabaseServerClient } = await import('@kit/supabase/server-client');
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id as string)
    .eq('status', 'active');

  if ((count ?? 0) === 0) {
    redirect('/onboarding');
  }

  return (
    <SidebarProvider defaultOpen={navigationConfig.sidebarCollapsed}>
      <Page style={'sidebar'}>
        <PageNavigation>
          <HomeSidebar user={user} />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between'}>
          <MobileNavigation />
        </PageMobileNavigation>

        {demoMode ? <DemoModeBanner /> : null}
        {children}
      </Page>
    </SidebarProvider>
  );
}

// ─── HeaderLayout ─────────────────────────────────────────────────────────────

function HeaderLayout({
  children,
  demoMode,
}: React.PropsWithChildren<{ demoMode: boolean }>) {
  return (
    <Page style={'header'}>
      <PageNavigation>
        <HomeMenuNavigation />
      </PageNavigation>

      <PageMobileNavigation className={'flex items-center justify-between'}>
        <MobileNavigation />
      </PageMobileNavigation>

      {demoMode ? <DemoModeBanner /> : null}
      {children}
    </Page>
  );
}

function MobileNavigation() {
  return (
    <>
      <AppLogo />
      <HomeMobileNavigation />
    </>
  );
}
