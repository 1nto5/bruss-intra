import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "./lib/dict";
import { auth } from "@/lib/auth";
import { canAccessApp, hasFullAccess } from "./lib/permissions";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppSidebar } from "./components/app-sidebar";
import { Info } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.pageTitle} (BRUSS)`,
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang = rawLang as Locale;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session?.user) {
    redirect(`/${lang}/login`);
  }

  const userRoles = session.user.roles ?? [];

  if (!canAccessApp(userRoles)) {
    return (
      <Alert className="mx-auto max-w-md">
        <Info className="h-4 w-4" />
        <AlertTitle>{dict.errors.appRestricted}</AlertTitle>
        <AlertDescription>
          {dict.errors.appRestrictedDescription}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <SidebarProvider
          defaultOpen
          className="gap-6 !bg-transparent [&_[data-sidebar=sidebar]]:!bg-transparent"
        >
          <Card>
            <AppSidebar
              lang={lang}
              dict={dict}
              hasFullAccess={hasFullAccess(userRoles)}
            />
          </Card>
          <SidebarInset>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <span className="text-sm font-semibold">{dict.title}</span>
            </header>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </CardContent>
    </Card>
  );
}
