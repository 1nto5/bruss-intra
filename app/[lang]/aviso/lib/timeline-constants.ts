export interface TimelineRange {
  startHour: number;
  endHour: number;
  hourCount: number;
  startMin: number;
  endMin: number;
  totalMin: number;
  gridTotal: number;
  hours: number[];
}

export function computeTimelineRange(
  appointments: { window_start: string; window_end: string }[],
  nowHour?: number,
): TimelineRange {
  // Baseline: always show 06:00-22:00
  let minHour = 6;
  let maxHour = 22;

  // Expand beyond 6-22 if any appointment falls outside
  for (const a of appointments) {
    const [sh, sm] = a.window_start.split(":").map(Number);
    const [eh, em] = a.window_end.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) continue;
    const startH = Math.floor((sh * 60 + sm) / 60);
    const endH = Math.ceil((eh * 60 + em) / 60);
    minHour = Math.min(minHour, startH);
    maxHour = Math.max(maxHour, endH);
  }

  if (nowHour !== undefined) {
    minHour = Math.min(minHour, nowHour);
    maxHour = Math.max(maxHour, nowHour + 1);
  }

  // Padding for appointments outside baseline (clamped to 0-23)
  minHour = Math.max(0, minHour < 6 ? minHour - 1 : minHour);
  maxHour = Math.min(23, maxHour > 22 ? maxHour + 1 : maxHour);

  return buildRange(minHour, maxHour);
}

function buildRange(startHour: number, endHour: number): TimelineRange {
  const hourCount = endHour - startHour + 1;
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const totalMin = endMin - startMin;
  const gridTotal = totalMin * (hourCount / (hourCount - 1));
  const hours = Array.from({ length: hourCount }, (_, i) => startHour + i);
  return { startHour, endHour, hourCount, startMin, endMin, totalMin, gridTotal, hours };
}
