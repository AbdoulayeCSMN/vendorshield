import type { JwtPayload } from '@supabase/supabase-js';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavigation,
} from '@kit/ui/shadcn-sidebar';
import { ModeToggle } from '@kit/ui/mode-toggle';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { navigationConfig } from '~/config/navigation.config';
import { Tables } from '~/lib/database.types';

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L4 7V15C4 21.627 9.373 27.627 16 30C22.627 27.627 28 21.627 28 15V7L16 2Z" className="fill-primary"/>
      <path d="M11 16l3.5 3.5L21 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

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
            <ShieldIcon />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>

      <SidebarFooter>
        {/* Toggle thème — masqué en mode icône */}
        <div className="group-data-[collapsible=icon]:hidden px-2 pb-1">
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
