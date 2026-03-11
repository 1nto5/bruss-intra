"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import React from "react";

interface NuqsProviderProps {
  children: React.ReactNode;
}

export function NuqsProvider({ children }: NuqsProviderProps) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
