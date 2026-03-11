export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatDateYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTimeHm(date: Date = new Date()): string {
  const h = `${date.getHours()}`.padStart(2, "0");
  const m = `${date.getMinutes()}`.padStart(2, "0");
  return `${h}:${m}`;
}

export function shiftDate(dateString: string, dayOffset: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + dayOffset);
  return formatDateYmd(date);
}

export function parseYmdOrToday(dateStr?: string): Date {
  if (dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function formatDateTimeYmdHm(date: Date): string {
  return `${formatDateYmd(date)} ${formatTimeHm(date)}`;
}

export function parseDateTimeString(str?: string): Date | undefined {
  if (!str) return undefined;
  // "YYYY-MM-DD HH:mm" format
  if (str.length > 10) {
    const d = new Date(str.replace(" ", "T") + ":00");
    if (!isNaN(d.getTime())) return d;
  }
  // "YYYY-MM-DD" format (backward compat)
  const d = new Date(str + "T00:00:00");
  if (!isNaN(d.getTime())) return d;
  return undefined;
}

export function parseDateTimeLocal(
  dateString: string,
  timeString: string,
): Date | null {
  if (!isValidDate(dateString) || !isValidTime(timeString)) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const [h, m] = timeString.split(":").map(Number);
  return new Date(year, month - 1, day, h, m, 0, 0);
}
