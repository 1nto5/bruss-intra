"use client";

import { ChristmasGreeting } from "./christmas-greeting";
import { ScatteredEmojis } from "./scattered-emojis";
import { Snowfall } from "./snowfall";

export function ChristmasWrapper() {
  return (
    <>
      <Snowfall />
      <ScatteredEmojis />
      <ChristmasGreeting />
    </>
  );
}
