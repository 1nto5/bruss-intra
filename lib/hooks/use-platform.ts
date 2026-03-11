"use client";

import { useEffect, useState } from "react";

export function usePlatform() {
  const [isMac, setIsMac] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsMac(navigator.userAgent.includes("Mac"));
  }, []);

  return {
    isMac,
    isClient,
    modifierKey: isMac ? "⌘" : "Ctrl",
    shortcut: (key: string) => (isMac ? `⌘${key}` : `Ctrl+${key}`),
  };
}
