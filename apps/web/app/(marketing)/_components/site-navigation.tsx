import Link from 'next/link';

import { Menu } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuList } from '@kit/ui/navigation-menu';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

import { SiteNavigationItem } from './site-navigation-item';

type NavLink = { label: string; path: string };

export async function SiteNavigation() {
  const { t } = await createI18nServerInstance();

  const links: NavLink[] = [
    { label: t('marketing:navFeatures'), path: '/#features' },
    { label: t('marketing:pricing'), path: '/pricing' },
    { label: t('marketing:faq'), path: '/faq' },
  ];

  const NavItems = links.map((item) => (
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
        <MobileDropdown links={links} openLabel={t('marketing:navOpenMenu')} />
      </div>
    </>
  );
}

function MobileDropdown({ links, openLabel }: { links: NavLink[]; openLabel: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={openLabel}>
        <Menu className={'h-8 w-8'} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={'w-full'}>
        {links.map((item) => (
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
