import { z } from "zod";

export const checkoutSchema = z.object({
  paymentMethod: z.enum(["card", "cash"]),
  address: z.object({
    addressLine: z.string().min(1, "Address line is required"),
    building: z.string().optional().default(""),
    floor: z.string().optional().default(""),
    apartment: z.string().optional().default(""),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "pending_payment",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  description: z.string().optional(),
});
