import { z } from "zod";
import mongoose from "mongoose";

// Helper to validate MongoDB ObjectId
const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ObjectId format" }
);

export const addItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.coerce.number().int().positive("Quantity must be at least 1").default(1),
});

export const updateItemSchema = z.object({
  quantity: z.coerce.number().int().nonnegative("Quantity cannot be negative"),
});
