'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { isChristmasMode as isChristmasPeriod } from '@/lib/config/christmas';

const STORAGE_KEY = 'christmas-mode-disabled';

type ChristmasContextType = {
  enabled: boolean;
  toggle: () => void;
  isChristmasPeriod: boolean;
};

const ChristmasContext = createContext<ChristmasContextType | undefined>(
  undefined
);

export function ChristmasModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(isChristmasPeriod);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const disabled = localStorage.getItem(STORAGE_KEY) === 'true';
    setEnabled(isChristmasPeriod && !disabled);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Update html class for CSS-based Christmas styles
    if (enabled) {
      document.documentElement.classList.add('christmas');
    } else {
      document.documentElement.classList.remove('christmas');
    }
  }, [enabled, mounted]);

  const toggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    if (newEnabled) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  return (
    <ChristmasContext.Provider
      value={{ enabled, toggle, isChristmasPeriod }}
    >
      {children}
    </ChristmasContext.Provider>
  );
}

export function useChristmas() {
  const context = useContext(ChristmasContext);
  if (context === undefined) {
    throw new Error('useChristmas must be used within ChristmasModeProvider');
  }
  return context;
}
