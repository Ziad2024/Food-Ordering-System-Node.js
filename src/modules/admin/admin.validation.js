import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["customer", "admin"], {
    required_error: "Role is required",
    invalid_type_error: "Role must be customer or admin",
  }),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({
    required_error: "isActive is required",
    invalid_type_error: "isActive must be a boolean",
  }),
});
