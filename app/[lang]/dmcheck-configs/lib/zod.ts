import * as z from 'zod';

export const createDmcheckConfigSchema = (validation: {
  workplaceRequired: string;
  articleNumberRequired: string;
  articleNameRequired: string;
  piecesPerBoxMin: string;
  dmcRequired: string;
  dmcFirstValidationRequired: string;
  dmcSecondValidationRequired: string;
  hydraProcessRequired: string;
  defectGroupRequired: string;
}) => {
  return z
    .object({
      workplace: z
        .string()
        .nonempty({ message: validation.workplaceRequired }),
      articleNumber: z
        .string()
        .nonempty({ message: validation.articleNumberRequired }),
      articleName: z
        .string()
        .nonempty({ message: validation.articleNameRequired }),
      articleNote: z.string().optional(),
      piecesPerBox: z.number().min(1, { message: validation.piecesPerBoxMin }),
      dmc: z.string().nonempty({ message: validation.dmcRequired }),
      dmcFirstValidation: z
        .string()
        .nonempty({ message: validation.dmcFirstValidationRequired }),
      secondValidation: z.boolean().optional(),
      dmcSecondValidation: z.string().optional(),
      hydraProcess: z
        .string()
        .nonempty({ message: validation.hydraProcessRequired }),
      ford: z.boolean().optional(),
      bmw: z.boolean().optional(),
      nonUniqueHydraBatch: z.boolean().optional(),
      requireDmcPartVerification: z.boolean().optional(),
      enableDefectReporting: z.boolean().optional(),
      requireDefectApproval: z.boolean().optional(),
      defectGroup: z.string().optional(),
    })
    .refine(
      (data) =>
        !data.secondValidation ||
        (data.dmcSecondValidation && data.dmcSecondValidation.length > 0),
      {
        message: validation.dmcSecondValidationRequired,
        path: ['dmcSecondValidation'],
      },
    )
    .refine(
      (data) =>
        !data.enableDefectReporting ||
        (data.defectGroup && data.defectGroup.length > 0),
      {
        message: validation.defectGroupRequired,
        path: ['defectGroup'],
      },
    );
};
