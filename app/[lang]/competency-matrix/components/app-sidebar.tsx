"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Users,
  Puzzle,
  Briefcase,
  Award,
  Calendar,
  Tag,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Dictionary } from "../lib/dict";

const SIDEBAR_COLLAPSE_BREAKPOINT = 1024;

function SidebarAutoCollapse() {
  const { setOpen } = useSidebar();

  useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${SIDEBAR_COLLAPSE_BREAKPOINT}px)`,
    );
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setOpen(e.matches);
    };
    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [setOpen]);

  return null;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  lang: string;
  dict: Dictionary;
  hasFullAccess: boolean;
}

export function AppSidebar({
  lang,
  dict,
  hasFullAccess,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const base = `/${lang}/competency-matrix`;

  const isActive = (href: string) => {
    // My Profile link is active only on the base path
    if (href === base) {
      return pathname === base;
    }
    // For /settings (evaluation periods), don't match /settings/cert-types/*
    if (href === `${base}/settings`) {
      return (
        pathname === href ||
        pathname.startsWith(`${base}/settings/evaluation-periods`)
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const mainLinks = [
    { href: base, label: dict.nav.myProfile, icon: User },
    { href: `${base}/employees`, label: dict.nav.employees, icon: Users },
  ];

  const adminLinks = [
    {
      href: `${base}/competencies`,
      label: dict.nav.competencies,
      icon: Puzzle,
      addHref: `${base}/competencies/add`,
      addLabel: dict.nav.addCompetency,
    },
    {
      href: `${base}/positions`,
      label: dict.nav.positions,
      icon: Briefcase,
      addHref: `${base}/positions/add`,
      addLabel: dict.nav.addPosition,
    },
    {
      href: `${base}/certifications`,
      label: dict.nav.certifications,
      icon: Award,
      addHref: `${base}/certifications/add`,
      addLabel: dict.nav.addCertification,
    },
    {
      href: `${base}/settings`,
      label: dict.nav.evaluationPeriods,
      icon: Calendar,
      addHref: `${base}/settings/evaluation-periods/add`,
      addLabel: dict.nav.addEvaluationPeriod,
    },
    {
      href: `${base}/settings/cert-types`,
      label: dict.nav.certTypes,
      icon: Tag,
      addHref: `${base}/settings/cert-types/add`,
      addLabel: dict.nav.addCertType,
    },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarAutoCollapse />
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainLinks.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(link.href)}
                      tooltip={link.label}
                    >
                      <Link href={link.href}>
                        <link.icon />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {hasFullAccess && (
            <SidebarGroup>
              <SidebarGroupLabel>{dict.nav.administration}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminLinks.map((link) => (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(link.href)}
                        tooltip={link.label}
                      >
                        <Link href={link.href}>
                          <link.icon />
                          <span>{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {"addHref" in link &&
                        link.addHref &&
                        isActive(link.href) && (
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href={link.addHref}>
                                  <Plus className="size-4" />
                                  <span>{link.addLabel}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </CardContent>
    </Sidebar>
  );
}
