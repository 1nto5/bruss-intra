import { z } from "zod";

const itemSchema = z.object({
  article_number: z.string().max(60).default(""),
  quantity: z.string().max(20).default(""),
  transfer_order: z.string().max(60).default(""),
});

export const appointmentSchema = z
  .object({
    plate: z
      .string()
      .min(1, "Plate is required")
      .max(20)
      .transform((v) => v.trim().toUpperCase()),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    window_start: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format"),
    window_end: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format"),
    op_loading: z.boolean().default(false),
    op_unloading: z.boolean().default(false),
    driver_name: z.string().max(120).default(""),
    company_name: z.string().max(120).default(""),
    carrier_name: z.string().max(120).default(""),
    driver_phone: z.string().max(40).default(""),
    company_phone: z.string().max(40).default(""),
    comment: z.string().max(600).default(""),
    items: z
      .array(itemSchema)
      .default([])
      .transform((rows) =>
        rows.filter(
          (r) => r.article_number || r.quantity || r.transfer_order,
        ),
      ),
    gate_entry_time: z.string().max(5).default(""),
    gate_exit_time: z.string().max(5).default(""),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.window_start.split(":").map(Number);
      const [eh, em] = data.window_end.split(":").map(Number);
      return sh * 60 + sm < eh * 60 + em;
    },
    { message: "Start time must be before end time", path: ["window_end"] },
  );

export type AppointmentFormData = z.input<typeof appointmentSchema>;

export const historyFilterSchema = z.object({
  q: z.string().max(120).default(""),
  from: z.string().default(""),
  to: z.string().default(""),
});
