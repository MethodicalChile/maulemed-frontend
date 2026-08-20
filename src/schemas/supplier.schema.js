import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

export const supplierFormSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    rut: z.string().optional().or(z.literal("")),
    contact_name: z.string().optional().or(z.literal("")),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    payment_terms: z.string().optional().or(z.literal("")),
    delivery_days: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined
          ? undefined
          : Number(val),
      z.number().optional(),
    ),
    is_active: z.boolean().default(true),
  }),
);
