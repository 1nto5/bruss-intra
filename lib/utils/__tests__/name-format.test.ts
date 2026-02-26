/**
 * Unit Tests for name-format.ts
 *
 * These functions parse names from emails like "john.smith@company.com"
 * Used for displaying user names throughout the app.
 */

import { describe, it, expect } from 'vitest';
import {
  shortenLastName,
  getLastNameFirstLetter,
  getFirstNameFromEmail,
  extractNameFromEmail,
  extractFullNameFromEmail,
  getInitialsFromEmail,
  stripDiacritics,
} from '../name-format';

// ============================================
// shortenLastName() - "John Smith" → "John S."
// ============================================
describe('shortenLastName', () => {
  it('shortens "John Smith" to "John S."', () => {
    expect(shortenLastName('John Smith')).toBe('John S.');
  });

  it('handles names with multiple parts', () => {
    expect(shortenLastName('John Van Der Berg')).toBe('John V.');
  });

  it('returns original if only one name part', () => {
    expect(shortenLastName('John')).toBe('John');
  });

  it('handles empty string', () => {
    expect(shortenLastName('')).toBe('');
  });
});

// ============================================
// getLastNameFirstLetter() - "John Smith" → "S"
// ============================================
describe('getLastNameFirstLetter', () => {
  it('extracts "S" from "John Smith"', () => {
    expect(getLastNameFirstLetter('John Smith')).toBe('S');
  });

  it('returns uppercase letter', () => {
    expect(getLastNameFirstLetter('john smith')).toBe('S');
  });
});

// ============================================
// getFirstNameFromEmail() - "john.smith@x.com" → "John"
// ============================================
describe('getFirstNameFromEmail', () => {
  it('extracts "John" from "john.smith@company.com"', () => {
    expect(getFirstNameFromEmail('john.smith@company.com')).toBe('John');
  });

  it('only capitalizes first letter (does not lowercase rest)', () => {
    // Note: function doesn't normalize case, just capitalizes first char
    expect(getFirstNameFromEmail('JOHN.smith@company.com')).toBe('JOHN');
  });

  it('handles email without dot in name', () => {
    expect(getFirstNameFromEmail('johnsmith@company.com')).toBe('Johnsmith');
  });
});

// ============================================
// extractNameFromEmail() - "john.smith@x.com" → "J. Smith"
// ============================================
describe('extractNameFromEmail', () => {
  it('extracts "J. Smith" from "john.smith@company.com"', () => {
    expect(extractNameFromEmail('john.smith@company.com')).toBe('J. Smith');
  });

  it('returns "System" for "system-cron"', () => {
    // Special case for automated system user
    expect(extractNameFromEmail('system-cron')).toBe('System');
  });

  it('returns empty string for undefined', () => {
    expect(extractNameFromEmail(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(extractNameFromEmail('')).toBe('');
  });

  it('handles email without dot (single name)', () => {
    const result = extractNameFromEmail('admin@company.com');
    expect(result).toBe('A. ');
  });
});

// ============================================
// extractFullNameFromEmail() - "john.smith@x.com" → "John Smith"
// ============================================
describe('extractFullNameFromEmail', () => {
  it('extracts "John Smith" from "john.smith@company.com"', () => {
    expect(extractFullNameFromEmail('john.smith@company.com')).toBe('John Smith');
  });

  it('only capitalizes first letter of each part (does not lowercase rest)', () => {
    // Note: function doesn't normalize case, just capitalizes first char of each part
    expect(extractFullNameFromEmail('JOHN.SMITH@company.com')).toBe('JOHN SMITH');
  });

  it('handles lowercase input', () => {
    expect(extractFullNameFromEmail('anna.kowalska@company.com')).toBe('Anna Kowalska');
  });

  it('handles email without dot in name', () => {
    // When there's no dot, there's no last name
    expect(extractFullNameFromEmail('admin@company.com')).toBe('Admin ');
  });
});

// ============================================
// getInitialsFromEmail() - "john.smith@x.com" → "JS"
// ============================================
describe('getInitialsFromEmail', () => {
  it('extracts "JS" from "john.smith@company.com"', () => {
    expect(getInitialsFromEmail('john.smith@company.com')).toBe('JS');
  });

  it('returns single letter for email without dot', () => {
    expect(getInitialsFromEmail('admin@company.com')).toBe('A');
  });

  it('handles three-part names', () => {
    // jan.van.berg@company.com → JVB
    expect(getInitialsFromEmail('jan.van.berg@company.com')).toBe('JVB');
  });

  it('always returns uppercase', () => {
    expect(getInitialsFromEmail('john.smith@company.com')).toBe('JS');
  });
});

// ============================================
// stripDiacritics() - removes diacritical marks
// ============================================
describe('stripDiacritics', () => {
  it('strips Polish diacritics', () => {
    expect(stripDiacritics('Wójcik')).toBe('Wojcik');
    expect(stripDiacritics('Zółć')).toBe('Zolc');
  });

  it('handles Polish L-stroke (not decomposed by NFD)', () => {
    expect(stripDiacritics('Łukasz')).toBe('Lukasz');
    expect(stripDiacritics('łukasz')).toBe('lukasz');
  });

  it('strips German umlauts', () => {
    expect(stripDiacritics('Müller')).toBe('Muller');
    expect(stripDiacritics('Schröder')).toBe('Schroder');
  });

  it('passes ASCII through unchanged', () => {
    expect(stripDiacritics('Kowalski')).toBe('Kowalski');
    expect(stripDiacritics('John Smith')).toBe('John Smith');
  });

  it('handles empty string', () => {
    expect(stripDiacritics('')).toBe('');
  });

  it('handles full Polish diacritic set', () => {
    expect(stripDiacritics('ąćęłńóśźż')).toBe('acelnoszz');
    expect(stripDiacritics('ĄĆĘŁŃÓŚŹŻ')).toBe('ACELNOSZZ');
  });
});
