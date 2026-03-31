import Link from 'next/link';

import { Menu } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuList } from '@kit/ui/navigation-menu';
import { Trans } from '@kit/ui/trans';

import { SiteNavigationItem } from './site-navigation-item';

const links: Record<string, { label: string; path: string }> = {
  Features: {
    label: 'Fonctionnalités',
    path: '/#features',
  },
  Pricing: {
    label: 'Tarifs',
    path: '/pricing',
  },
  FAQ: {
    label: 'FAQ',
    path: '/faq',
  },
};

export function SiteNavigation() {
  const NavItems = Object.entries(links).map(([key, item]) => (
    <SiteNavigationItem key={item.path} path={item.path}>
      {item.label}
    </SiteNavigationItem>
  ));

  return (
    <>
      <div className={'hidden items-center justify-center md:flex'}>
        <NavigationMenu className={'px-4 py-2'}>
          <NavigationMenuList className={'space-x-5'}>{NavItems}</NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className={'flex justify-start sm:items-center md:hidden'}>
        <MobileDropdown />
      </div>
    </>
  );
}

function MobileDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={'Ouvrir le menu'}>
        <Menu className={'h-8 w-8'} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={'w-full'}>
        {Object.values(links).map((item) => (
          <DropdownMenuItem key={item.path} asChild>
            <Link className="flex w-full h-full items-center" href={item.path}>
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
