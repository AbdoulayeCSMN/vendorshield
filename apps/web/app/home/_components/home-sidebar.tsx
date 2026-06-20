import type { JwtPayload } from '@supabase/supabase-js';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavigation,
} from '@kit/ui/shadcn-sidebar';
import { ModeToggle } from '@kit/ui/mode-toggle';

import { LanguageSwitcher } from './language-switcher';

import { AppLogo } from '~/components/app-logo';
import { BrandMark } from '~/components/brand-mark';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { navigationConfig } from '~/config/navigation.config';
import { Tables } from '~/lib/database.types';

export function HomeSidebar(props: {
  account?: Tables<'accounts'>;
  user: JwtPayload;
}) {
  return (
    <Sidebar collapsible={'icon'}>
      <SidebarHeader className={'h-16 justify-center overflow-hidden'}>
        <div className={'flex items-center space-x-2'}>
          <div className={'group-data-[collapsible=icon]:hidden'}>
            <AppLogo className={'max-w-full'} />
          </div>
          <div className={'hidden group-data-[collapsible=icon]:flex w-full justify-center'}>
            <BrandMark className="h-7 w-7" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>

      <SidebarFooter>
        {/* Langue + thème — masqués en mode icône */}
        <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2 px-2 pb-1">
          <div className="flex-1">
            <LanguageSwitcher />
          </div>
          <ModeToggle />
        </div>
        <ProfileAccountDropdownContainer
          user={props.user}
          account={props.account}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
