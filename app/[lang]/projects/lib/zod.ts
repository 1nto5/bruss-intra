import * as z from "zod";

export const ProjectsSchema = z.object({
  scope: z.string(),
  date: z.date(),
  time: z
    .union([z.string(), z.number()])
    .transform((arg) => Number(arg))
    .pipe(z.number()),
  note: z.string().optional(),
});

export type ProjectsType = z.infer<typeof ProjectsSchema>;
