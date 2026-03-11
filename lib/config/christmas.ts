// Christmas mode: Dec 15 - Jan 6, except Dec 29 (inventory day)
const CHRISTMAS_START_DAY = 15;
const CHRISTMAS_END_DAY = 6;
const BLACKOUT_DATES = [{ month: 12, day: 29 }]; // Disable Christmas for entire project on these dates

function isChristmasPeriod(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Check blackout dates - disable entirely on these days
  if (BLACKOUT_DATES.some((d) => d.month === month && d.day === day)) {
    return false;
  }

  return (
    (month === 12 && day >= CHRISTMAS_START_DAY) ||
    (month === 1 && day <= CHRISTMAS_END_DAY)
  );
}

export const isChristmasMode =
  process.env.NEXT_PUBLIC_CHRISTMAS_MODE === "true" || isChristmasPeriod();

export function isChristmasEnabledForPath(_pathname: string): boolean {
  return isChristmasMode;
}

export const christmasWishes: Record<string, string> = {
  pl: "Wesołych Świąt i Szczęśliwego Nowego Roku!",
  en: "Merry Christmas and Happy New Year!",
  de: "Frohe Weihnachten und ein Glückliches Neues Jahr!",
  uk: "Веселого Різдва та Щасливого Нового Року!",
  be: "Вясёлых Калядаў і Шчаслівага Новага Года!",
  tl: "Maligayang Pasko at Manigong Bagong Taon!",
};
