"use client";

import { useEffect, useState } from "react";

const CHRISTMAS_EMOJIS = [
  "🎄",
  "🎅",
  "🤶",
  "⛄",
  "☃️",
  "🎁",
  "⭐",
  "🌟",
  "✨",
  "🔔",
  "🕯️",
  "❄️",
  "🧤",
  "🌲",
];

interface ScatteredEmoji {
  id: number;
  emoji: string;
  top: number;
  left: number;
  size: number;
  opacity: number;
  rotation: number;
  shadowColor: string;
  shadowBlur: number;
}

const SHADOW_COLORS = [
  "rgba(255, 0, 0, 0.5)", // red
  "rgba(0, 128, 0, 0.5)", // green
  "rgba(255, 215, 0, 0.5)", // gold
  "rgba(0, 100, 200, 0.5)", // blue
  "rgba(255, 105, 180, 0.5)", // pink
  "rgba(138, 43, 226, 0.5)", // purple
  "rgba(255, 140, 0, 0.5)", // orange
  "rgba(0, 206, 209, 0.5)", // turquoise
];

export function ScatteredEmojis() {
  const [emojis, setEmojis] = useState<ScatteredEmoji[]>([]);

  useEffect(() => {
    const generateEmojis = () => {
      const count = 12 + Math.floor(Math.random() * 6); // 12-18 emojis
      const newEmojis: ScatteredEmoji[] = [];
      const minDistance = 8; // Minimum distance between emojis (in %)

      const isTooClose = (top: number, left: number): boolean => {
        return newEmojis.some((e) => {
          const dist = Math.sqrt((e.top - top) ** 2 + (e.left - left) ** 2);
          return dist < minDistance;
        });
      };

      for (let i = 0; i < count; i++) {
        let top: number, left: number;
        let attempts = 0;
        const maxAttempts = 20;

        do {
          // Scatter along edges (top, bottom, left, right margins)
          const edge = Math.floor(Math.random() * 4);

          switch (edge) {
            case 0: // Top edge
              top = Math.random() * 8;
              left = Math.random() * 100;
              break;
            case 1: // Bottom edge
              top = 90 + Math.random() * 10;
              left = Math.random() * 100;
              break;
            case 2: // Left edge
              top = Math.random() * 100;
              left = Math.random() * 6;
              break;
            case 3: // Right edge
              top = Math.random() * 100;
              left = 95 + Math.random() * 5;
              break;
            default:
              top = Math.random() * 100;
              left = Math.random() * 100;
          }
          attempts++;
        } while (isTooClose(top!, left!) && attempts < maxAttempts);

        newEmojis.push({
          id: i,
          emoji:
            CHRISTMAS_EMOJIS[
              Math.floor(Math.random() * CHRISTMAS_EMOJIS.length)
            ],
          top: top!,
          left: left!,
          size: 20 + Math.random() * 24, // 20-44px
          opacity: 0.5 + Math.random() * 0.4, // 0.5-0.9
          rotation: -20 + Math.random() * 40, // -20 to 20 degrees
          shadowColor:
            SHADOW_COLORS[Math.floor(Math.random() * SHADOW_COLORS.length)],
          shadowBlur: 4 + Math.random() * 8, // 4-12px blur
        });
      }

      setEmojis(newEmojis);
    };

    generateEmojis();
  }, []);

  return (
    <div className="scattered-emojis-container" aria-hidden="true">
      {emojis.map((e) => (
        <span
          key={e.id}
          className="scattered-emoji"
          style={{
            position: "fixed",
            top: `${e.top}%`,
            left: `${e.left}%`,
            fontSize: `${e.size}px`,
            opacity: e.opacity,
            transform: `rotate(${e.rotation}deg)`,
            pointerEvents: "none",
            zIndex: 2,
            filter: `drop-shadow(0 2px ${e.shadowBlur}px ${e.shadowColor})`,
            transition: "opacity 0.3s",
          }}
        >
          {e.emoji}
        </span>
      ))}
    </div>
  );
}
