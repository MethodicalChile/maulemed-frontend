import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

export const userFormSchema = toTypedSchema(
  z
    .object({
      username: z
        .string()
        .min(3, "El usuario debe tener al menos 3 caracteres"),
      first_name: z.string().min(1, "El nombre es obligatorio"),
      last_name: z.string().min(1, "El apellido es obligatorio"),
      email: z.string().email("Email inválido").optional().or(z.literal("")),
      password: z
        .string()
        .min(6, "Mínimo 6 caracteres")
        .optional()
        .or(z.literal("")),
      password_confirm: z.string().optional().or(z.literal("")),
      is_active: z.boolean().default(true),
      rut: z.string().optional().or(z.literal("")),
      phone: z.string().optional().or(z.literal("")),
      position: z.string().optional().or(z.literal("")),
      organization: z.string().optional().or(z.literal("")),
    })
    .refine(
      (data) => {
        if (data.password && data.password !== data.password_confirm) {
          return false;
        }
        return true;
      },
      {
        message: "Las contraseñas no coinciden",
        path: ["password_confirm"],
      },
    ),
);
