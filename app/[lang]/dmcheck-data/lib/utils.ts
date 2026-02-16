/**
 * Count comma-separated values in a string
 */
export function getValueCount(value: string): number {
  if (!value.trim()) return 0;
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0).length;
}

/**
 * Get date one week ago at 00:00:00
 */
export function getOneWeekAgo(): Date {
  const today = new Date();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);
  oneWeekAgo.setHours(0, 0, 0, 0);
  return oneWeekAgo;
}

/**
 * Get today at 23:59:59
 */
export function getToday(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

export function formatOperators(
  operator: string | string[] | undefined,
): string {
  if (!operator) return '';
  if (Array.isArray(operator)) return operator.join(', ');
  return operator;
}
