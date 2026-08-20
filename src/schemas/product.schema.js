import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

export const productFormSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    sku: z.string().optional().or(z.literal("")),
    barcode: z.string().optional().or(z.literal("")),
    internal_code: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    category: z.string().min(1, "La categoría es obligatoria"),
    unit: z.string().min(1, "La unidad es obligatoria"),
    requires_lot: z.boolean().default(false),
    requires_expiration_date: z.boolean().default(false),
    is_medication: z.boolean().default(false),
    is_controlled: z.boolean().default(false),
    is_active: z.boolean().default(true),
    quality_rating: z.number().min(0).max(5).default(0),
    image: z.any().optional(),
    remove_image: z.boolean().default(false),
  }),
);
