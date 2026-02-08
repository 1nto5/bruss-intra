import { Button } from '@/components/ui/button';

import { auth } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Logo from '@/components/ui/logo';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { MobileNav } from './mobile-nav';
import { cn } from '@/lib/utils/cn';
import {
  adminHeaderRoutes,
  deHeaderRoutes,
  enHeaderRoutes,
  plHeaderRoutes,
  type HeaderRoute,
} from '@/lib/config/header-routes';
import { isRouteAllowed, plant } from '@/lib/config/plant';
import { getInitials, getInitialsFromEmail } from '@/lib/utils/name-format';
import { Locale } from '@/lib/config/i18n';
import { LogIn } from 'lucide-react';
import { LogoutButton } from './logout-button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';
import { ThemeModeToggle } from '../../../components/theme-mode-toggle';
import { ChristmasModeToggle } from '@/components/christmas';
import LanguageSwitcher from './language-switcher';

type HeaderProps = {
  dict: any;
  lang: Locale;
};

// export const dynamic = 'force-dynamic';

export default async function Header({ dict, lang }: HeaderProps) {
  const session = await auth();

  const baseRoutes =
    lang === 'de'
      ? deHeaderRoutes
      : lang === 'en'
        ? enHeaderRoutes
        : plHeaderRoutes;
  const allRoutes = session?.user?.roles?.includes('admin')
    ? [...baseRoutes, ...adminHeaderRoutes]
    : baseRoutes;

  // Filter routes by plant restrictions and remove empty categories
  const routes = allRoutes
    .map((route): HeaderRoute => ({
      ...route,
      submenu: route.submenu
        .filter((item) => isRouteAllowed(item.href))
        .filter((item) => !item.plant || item.plant === plant),
    }))
    .filter((route) => route.submenu.length > 0);

  return (
    <header
      className={cn(
        // Industrial header: panel styling with subtle shadow
        'sticky top-0 z-50 w-full transition-all',
        'bg-[var(--panel-bg)] border-b border-[var(--panel-border)]',
        'shadow-[0_1px_3px_oklch(0.2_0.02_260/0.08)]',
        'px-4 py-3',
      )}
    >
      <div className='relative mx-auto flex h-6 w-full items-center justify-between'>
        <div className='flex items-center'>
          <MobileNav routes={routes} lang={lang} />
          <Link href={`/${lang}`} className='flex items-center'>
            <Logo />
          </Link>
        </div>
        <nav className='hidden items-center sm:block'>
          <NavigationMenu>
            <NavigationMenuList>
              {routes.map((route) => (
                <NavigationMenuItem key={route.title}>
                  <NavigationMenuTrigger className={`p-2`}>
                    {route.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className='grid w-[400px] gap-1 p-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]'>
                      {route.submenu.map((subItem) => (
                        <ListItem
                          key={subItem.title}
                          title={subItem.title}
                          href={`/${lang}${subItem.href}`}
                        ></ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
        <div className='flex items-center space-x-1'>
          {session ? (
            <>
              {session.user?.email && (
                <Avatar>
                  <AvatarFallback>
                    {getInitials(session.user.firstName, session.user.lastName) ||
                      getInitialsFromEmail(session.user.email)}
                  </AvatarFallback>
                </Avatar>
              )}
              <LogoutButton lang={lang} />
            </>
          ) : (
            <form
              action={async () => {
                'use server';
                redirect(`/${lang}/auth`);
              }}
            >
              <Button variant={'ghost'} size='icon'>
                <LogIn />
              </Button>
            </form>
          )}

          <ChristmasModeToggle />
          <ThemeModeToggle />
          <LanguageSwitcher currentLang={lang} />
        </div>
      </div>
    </header>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            // Industrial list item: subtle hover with bruss accent
            'block space-y-1 rounded-sm p-3 leading-none no-underline outline-hidden select-none',
            'transition-all duration-150 ease-[var(--ease-standard)]',
            'hover:bg-bruss/5 hover:text-foreground',
            'focus:bg-bruss/10 focus:text-foreground',
            className,
          )}
          {...props}
        >
          <div className='text-sm leading-none font-semibold'>{title}</div>
          <p className='text-muted-foreground line-clamp-2 text-sm leading-snug'>
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
