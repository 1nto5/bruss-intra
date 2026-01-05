/**
 * Unit Tests for date-format.ts
 *
 * HOW TESTS WORK:
 * ===============
 *
 * 1. describe() - Groups related tests together
 *    Like folders for your tests
 *
 * 2. it() or test() - Defines a single test case
 *    Each one tests ONE specific behavior
 *
 * 3. expect() - Makes assertions
 *    "I expect this value to equal that value"
 *
 * RUN TESTS:
 *   bun test           - Watch mode (re-runs on file change)
 *   bun test:run       - Run once and exit
 */

import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTime,
  formatDateTime,
  convertToTimezone,
  convertToLocalTime,
} from '../date-format';

// ============================================
// formatDate() tests
// ============================================
describe('formatDate', () => {
  // Test 1: Normal case - does it work with a valid date?
  it('formats a valid Date object', () => {
    const date = new Date('2025-01-15T10:30:00');
    const result = formatDate(date);

    // Result depends on locale (pl-PL), should be like "15.01.2025"
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  // Test 2: String input - dates often come as strings from APIs
  it('formats a valid date string', () => {
    const result = formatDate('2025-06-20');

    expect(result).toContain('20');
    expect(result).toContain('2025');
  });

  // Test 3: Null handling - what happens with missing data?
  it('returns "-" for null input', () => {
    const result = formatDate(null);

    expect(result).toBe('-');
  });

  // Test 4: Undefined handling
  it('returns "-" for undefined input', () => {
    const result = formatDate(undefined);

    expect(result).toBe('-');
  });

  // Test 5: Invalid date string
  it('returns "-" for invalid date string', () => {
    const result = formatDate('not-a-date');

    expect(result).toBe('-');
  });

  // Test 6: Empty string
  it('returns "-" for empty string', () => {
    const result = formatDate('');

    expect(result).toBe('-');
  });
});

// ============================================
// formatTime() tests
// ============================================
describe('formatTime', () => {
  it('formats time from a Date object', () => {
    const date = new Date('2025-01-15T14:30:45');
    const result = formatTime(date);

    // Should contain hour and minute
    expect(result).toContain('14');
    expect(result).toContain('30');
  });

  it('returns "-" for null', () => {
    expect(formatTime(null)).toBe('-');
  });

  it('returns "-" for invalid date', () => {
    expect(formatTime('invalid')).toBe('-');
  });
});

// ============================================
// formatDateTime() tests
// ============================================
describe('formatDateTime', () => {
  it('formats both date and time', () => {
    const date = new Date('2025-01-15T14:30:45');
    const result = formatDateTime(date);

    // Should contain date parts AND time parts
    expect(result).toContain('15');
    expect(result).toContain('2025');
    expect(result).toContain('14');
    expect(result).toContain('30');
  });

  it('returns "-" for null', () => {
    expect(formatDateTime(null)).toBe('-');
  });
});

// ============================================
// convertToTimezone() tests
// ============================================
describe('convertToTimezone', () => {
  it('converts UTC date to specified timezone', () => {
    // Create a UTC date
    const utcDate = new Date('2025-01-15T12:00:00Z');

    // Convert to Warsaw timezone (UTC+1 in winter)
    const result = convertToTimezone(utcDate, 'Europe/Warsaw');

    // Warsaw is UTC+1, so 12:00 UTC = 13:00 Warsaw
    expect(result.getHours()).toBe(13);
  });

  it('handles different timezones', () => {
    const utcDate = new Date('2025-01-15T12:00:00Z');

    // New York is UTC-5 in winter
    const nyResult = convertToTimezone(utcDate, 'America/New_York');
    expect(nyResult.getHours()).toBe(7);
  });
});

// ============================================
// convertToLocalTime() tests
// ============================================
describe('convertToLocalTime', () => {
  it('returns a Date object', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    const result = convertToLocalTime(date);

    expect(result).toBeInstanceOf(Date);
  });

  it('preserves the date value', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    const result = convertToLocalTime(date);

    // The date should still be January 15th (may vary by local timezone)
    expect(result.getDate()).toBeGreaterThanOrEqual(14);
    expect(result.getDate()).toBeLessThanOrEqual(16);
  });
});
