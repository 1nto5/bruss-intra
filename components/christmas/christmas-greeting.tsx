"use client";

import { christmasWishes } from "@/lib/config/christmas";
import { useParams } from "next/navigation";

export function ChristmasGreeting() {
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const wish = christmasWishes[lang] || christmasWishes.en;

  return (
    <div className="christmas-greeting pointer-events-none fixed bottom-4 left-1/2 z-[9998] -translate-x-1/2">
      <div className="rounded-full bg-gradient-to-r from-red-600 via-green-600 to-red-600 px-6 py-2 shadow-lg">
        <p className="whitespace-nowrap text-center text-sm font-bold text-white drop-shadow-md">
          {wish}
        </p>
      </div>
    </div>
  );
}
