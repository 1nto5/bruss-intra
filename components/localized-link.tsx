"use client";

import Link, { LinkProps } from "next/link";
import { useParams } from "next/navigation";
import { ReactNode } from "react";
import { i18n } from "@/lib/config/i18n";

interface LocalizedLinkProps extends Omit<LinkProps, "href"> {
  href: string;
  children: ReactNode;
  className?: string;
}

/**
 * A Link component that automatically prepends the current language to internal URLs.
 *
 * Usage:
 * - <LocalizedLink href="/oven-data">...</LocalizedLink> → /pl/oven-data (if current lang is 'pl')
 * - <LocalizedLink href="oee">...</LocalizedLink> → relative path
 *
 * For external URLs, use the standard Next.js <Link> component instead.
 */
export default function LocalizedLink({
  href,
  children,
  className,
  ...props
}: LocalizedLinkProps) {
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;

  // If href starts with /, prepend language
  const localizedHref = href.startsWith("/") ? `/${lang}${href}` : href;

  return (
    <Link href={localizedHref} className={className} {...props}>
      {children}
    </Link>
  );
}
