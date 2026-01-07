'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Locale } from '@/lib/config/i18n';
import { Menu } from 'lucide-react';
import Link from 'next/link';

type Route = {
  title: string;
  submenu: { title: string; href: string }[];
};

type MobileNavProps = {
  routes: Route[];
  lang: Locale;
};

export function MobileNav({ routes, lang }: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className='sm:hidden' variant={'ghost'} size='icon'>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side='left' className='w-[250px] sm:w-[300px]'>
        <VisuallyHidden asChild>
          <SheetTitle>Navigation Menu</SheetTitle>
        </VisuallyHidden>
        <nav className='flex flex-col gap-4'>
          {routes.map((route, i) => (
            <div key={i}>
              <span className='block px-2 py-1 text-sm'>{route.title}</span>
              <div className='ml-4'>
                {route.submenu.map((sub) => (
                  <SheetClose key={sub.title} asChild>
                    <Link
                      href={`/${lang}${sub.href}`}
                      className='block px-2 py-1 text-lg'
                    >
                      {sub.title}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
