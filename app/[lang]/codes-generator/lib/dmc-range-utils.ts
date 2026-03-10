import { z } from "zod";

export const dmcRangeSchema = z.object({
  pattern: z.string().min(1, "Pattern is required"),
  isRange: z.boolean().default(false),
});

export type DmcRangeInput = z.infer<typeof dmcRangeSchema>;

export function validateDmcPattern(pattern: string): {
  isValid: boolean;
  error?: string;
  codeCount?: number;
} {
  // Check if it's a range pattern
  const rangeMatch = pattern.match(/\(od\s+(\d+)\s+do\s+(\d+)\)/);

  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);

    if (start >= end) {
      return {
        isValid: false,
        error: "Range start must be less than range end",
      };
    }

    const codeCount = end - start + 1;

    if (codeCount > 1000) {
      return {
        isValid: false,
        error: "Range too large (max 1000 codes)",
      };
    }

    return {
      isValid: true,
      codeCount,
    };
  }

  // Single code
  return {
    isValid: true,
    codeCount: 1,
  };
}

export function extractRangeInfo(pattern: string) {
  const rangeMatch = pattern.match(/\(od\s+(\d+)\s+do\s+(\d+)\)/);

  if (rangeMatch) {
    return {
      start: parseInt(rangeMatch[1]),
      end: parseInt(rangeMatch[2]),
      count: parseInt(rangeMatch[2]) - parseInt(rangeMatch[1]) + 1,
    };
  }

  return null;
}
