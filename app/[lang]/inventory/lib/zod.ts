import * as z from 'zod';

// ============================================================================
// FACTORY FUNCTIONS FOR TRANSLATED SCHEMAS
// ============================================================================

export const createUpdatePositionSchema = (
  validation: {
    quantityMustBeNumber: string;
    quantityCannotBeNegative: string;
    binRequired?: string;
  },
  config?: {
    hasBins?: boolean;
  },
) => {
  const hasBins = config?.hasBins ?? false;

  return z.object({
    articleNumber: z.string(),
    quantity: z
      .union([z.string(), z.number()])
      .transform((val) => (typeof val === 'number' ? val : Number(val)))
      .pipe(
        z.number().min(0, {
          message: validation.quantityCannotBeNegative,
        }),
      ),
    unit: z.string(),
    wip: z.boolean(),
    approved: z.boolean().optional(),
    bin: hasBins
      ? z.string().min(1, { message: validation.binRequired || 'BIN required' })
      : z.string().optional(),
    deliveryDate: z.date().optional(),
    comment: z.string().optional(),
  });
};

export type PositionZodType = z.infer<
  ReturnType<typeof createUpdatePositionSchema>
>;
