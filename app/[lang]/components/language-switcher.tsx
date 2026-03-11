"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/lib/config/i18n";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface LanguageSwitcherProps {
  currentLang: Locale;
}

export default function LanguageSwitcher({
  currentLang,
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const switchLanguage = (newLang: Locale) => {
    if (newLang === currentLang) return;

    // Replace the language in the pathname
    const segments = pathname.split("/");
    segments[1] = newLang; // Replace [lang] segment
    const newPathname = segments.join("/");

    // Preserve search params
    const search = searchParams.toString();
    const url = search ? `${newPathname}?${search}` : newPathname;

    router.push(url);
  };

  const languages: { code: "pl" | "de" | "en"; name: string }[] = [
    { code: "pl", name: "Polski" },
    { code: "de", name: "Deutsch" },
    { code: "en", name: "English" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Image
            src={`/flags/${currentLang}.svg`}
            alt={`${currentLang} flag`}
            width={24}
            height={18}
            className="rounded-sm"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={currentLang === lang.code ? "bg-accent" : ""}
          >
            <div className="flex items-center gap-3">
              <Image
                src={`/flags/${lang.code}.svg`}
                alt={`${lang.code} flag`}
                width={20}
                height={15}
                className="rounded-sm"
              />
              <span>{lang.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
