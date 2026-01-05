/**
 * Date formatting utilities using DATE_TIME_LOCALE environment variable
 *
 * These functions provide consistent date/time formatting across the application
 * based on the DATE_TIME_LOCALE setting (typically 'pl-PL')
 */

/**
 * Get the locale to use for formatting
 * Uses DATE_TIME_LOCALE from environment, falls back to 'pl-PL'
 */
function getLocale(): string {
  return process.env.NEXT_PUBLIC_LOCALE || 'pl-PL';
}

/**
 * Format a date as localized date string (e.g., "14.10.2025")
 *
 * @param date - Date object, date string, or null/undefined
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string, or '-' if date is invalid
 *
 * @example
 * formatDate(new Date()) // "14.10.2025"
 * formatDate("2025-10-14") // "14.10.2025"
 * formatDate(null) // "-"
 */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  return dateObj.toLocaleDateString(getLocale(), options);
}

/**
 * Format a date as localized time string (e.g., "14:30:45")
 *
 * @param date - Date object, date string, or null/undefined
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted time string, or '-' if date is invalid
 *
 * @example
 * formatTime(new Date()) // "14:30:45"
 * formatTime(new Date(), { hour: '2-digit', minute: '2-digit' }) // "14:30"
 */
export function formatTime(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  return dateObj.toLocaleTimeString(getLocale(), options);
}

/**
 * Format a date as localized date and time string (e.g., "14.10.2025, 14:30:45")
 *
 * @param date - Date object, date string, or null/undefined
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date-time string, or '-' if date is invalid
 *
 * @example
 * formatDateTime(new Date()) // "14.10.2025, 14:30:45"
 * formatDateTime("2025-10-14T14:30:00") // "14.10.2025, 14:30:00"
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  return dateObj.toLocaleString(getLocale(), options);
}

/**
 * Convert UTC date to specified timezone for Excel export
 * Uses native toLocaleString with timeZone option
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Convert UTC date to local timezone for Excel export
 */
export function convertToLocalTime(date: Date): Date {
  return new Date(date.toLocaleString('en-US'));
}
