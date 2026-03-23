import * as z from "zod";

export const createLineItemSchema = (validation: {
  articleNumberRequired: string;
  articleNameRequired: string;
  batchRequired: string;
  quantityMin: string;
  unitPriceMin: string;
}) => {
  return z.object({
    articleNumber: z.string().min(1, { message: validation.articleNumberRequired }),
    articleName: z.string().min(1, { message: validation.articleNameRequired }),
    quarry: z.string().optional(),
    batch: z.string().min(1, { message: validation.batchRequired }),
    quantity: z.number().min(1, { message: validation.quantityMin }),
    unitPrice: z.number().min(0, { message: validation.unitPriceMin }),
    value: z.number(),
    comment: z.string().optional(),
  });
};

export const createCorrectionSchema = (validation: {
  typeRequired: string;
  itemsMin: string;
  articleNumberRequired: string;
  articleNameRequired: string;
  batchRequired: string;
  quantityMin: string;
  sourceWarehouseRequired: string;
  targetWarehouseRequired: string;
  unitPriceMin: string;
  reasonRequired: string;
}) => {
  const lineItemSchema = createLineItemSchema(validation);

  return z.object({
    _id: z.string().optional(),
    type: z.enum(["transfer", "nok-block", "scrapping"], {
      message: validation.typeRequired,
    }),
    sourceWarehouse: z
      .string()
      .min(1, { message: validation.sourceWarehouseRequired }),
    targetWarehouse: z
      .string()
      .min(1, { message: validation.targetWarehouseRequired }),
    reason: z.string().min(1, { message: validation.reasonRequired }),
    items: z.array(lineItemSchema).min(1, { message: validation.itemsMin }),
  });
};

export const createRejectSchema = (validation: {
  rejectionReasonMin: string;
  rejectionReasonMax: string;
}) => {
  return z.object({
    rejectionReason: z
      .string()
      .min(10, { message: validation.rejectionReasonMin })
      .max(500, { message: validation.rejectionReasonMax }),
  });
};

export const createCommentSchema = (validation: {
  commentMin: string;
  commentMax: string;
}) => {
  return z.object({
    content: z
      .string()
      .min(1, { message: validation.commentMin })
      .max(1000, { message: validation.commentMax }),
  });
};

export type CorrectionFormValues = z.infer<
  ReturnType<typeof createCorrectionSchema>
>;
export type LineItemValues = z.infer<ReturnType<typeof createLineItemSchema>>;
export type RejectFormValues = z.infer<ReturnType<typeof createRejectSchema>>;
export type CommentFormValues = z.infer<ReturnType<typeof createCommentSchema>>;
