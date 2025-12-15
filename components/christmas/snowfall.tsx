'use client';

import { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  driftSpeed: number;
  char: string;
}

// Snowflakes only - no Christmas emojis in snow
const SNOWFLAKE_CHARS = ['❄', '❅', '❆', '✻', '✼', '❉', '•', '❄', '❅', '❆', '❄', '❅', '❆'];

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // Use clientWidth/clientHeight to avoid scrollbar issues
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
    };

    const createSnowflake = (): Snowflake => {
      const char = SNOWFLAKE_CHARS[Math.floor(Math.random() * SNOWFLAKE_CHARS.length)];

      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * -100,
        size: Math.random() * 16 + 8,
        speed: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.6 + 0.4,
        drift: 0,
        driftSpeed: Math.random() * 0.015 + 0.005,
        char,
      };
    };

    const initSnowflakes = () => {
      // Minimal density for subtle effect
      const count = Math.floor((window.innerWidth * window.innerHeight) / 50000);
      snowflakesRef.current = Array.from({ length: Math.min(count, 10) }, () => {
        const flake = createSnowflake();
        flake.y = Math.random() * window.innerHeight;
        return flake;
      });
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = document.documentElement.classList.contains('dark');

      snowflakesRef.current.forEach((flake) => {
        flake.y += flake.speed;
        flake.drift += flake.driftSpeed;
        flake.x += Math.sin(flake.drift) * 0.5;

        if (flake.y > canvas.height + 20) {
          flake.y = -20;
          flake.x = Math.random() * canvas.width;
        }

        if (flake.x > canvas.width + 20) flake.x = -20;
        if (flake.x < -20) flake.x = canvas.width + 20;

        ctx.font = `${flake.size}px sans-serif`;
        // Snowflakes get theme-based colors
        ctx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${flake.opacity})`
          : `rgba(30, 70, 130, ${Math.min(flake.opacity + 0.3, 1)})`;
        ctx.shadowColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(20,50,100,0.6)';
        ctx.shadowBlur = isDark ? 4 : 3;

        ctx.fillText(flake.char, flake.x, flake.y);
        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      resizeCanvas();
      initSnowflakes();
    };

    resizeCanvas();
    initSnowflakes();
    animate();

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ width: '100vw', height: '100vh', maxWidth: '100%', maxHeight: '100%' }}
      aria-hidden="true"
    />
  );
}
