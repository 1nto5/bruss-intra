export const START_HOUR = 6;
export const END_HOUR = 22;
export const HOUR_COUNT = END_HOUR - START_HOUR + 1; // 17
export const START_MIN = START_HOUR * 60; // 360
export const END_MIN = END_HOUR * 60; // 1320
export const TOTAL_MIN = END_MIN - START_MIN; // 960
export const GRID_TOTAL = TOTAL_MIN * (HOUR_COUNT / (HOUR_COUNT - 1)); // 1020
export const HOURS = Array.from(
  { length: HOUR_COUNT },
  (_, i) => START_HOUR + i,
);
