import { z } from "zod";
import mongoose from "mongoose";

// Helper to validate MongoDB ObjectId
const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ObjectId format" }
);

// Helper to preprocess booleans from form-data (where "false" is a non-empty string)
const formBoolean = z.preprocess((val) => {
  if (val === "true" || val === 1 || val === "1" || val === true) return true;
  if (val === "false" || val === 0 || val === "0" || val === false) return false;
  return undefined;
}, z.boolean());

// Helper to preprocess optional booleans
const formBooleanOptional = z.preprocess((val) => {
  if (val === "true" || val === 1 || val === "1" || val === true) return true;
  if (val === "false" || val === 0 || val === "0" || val === false) return false;
  return undefined;
}, z.boolean().optional());

// Category Schemas
export const createCategorySchema = z.object({
  name: z.object({
    en: z.string().min(1, "English category name is required").max(100),
    ar: z.string().min(1, "Arabic category name is required").max(100),
  }),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateCategorySchema = z.object({
  name: z.object({
    en: z.string().min(1, "English category name must be at least 1 character").max(100).optional(),
    ar: z.string().min(1, "Arabic category name must be at least 1 character").max(100).optional(),
  }).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: formBooleanOptional,
});

// Product Schemas
export const createProductSchema = z.object({
  name: z.object({
    en: z.string().min(1, "English product name is required").max(150),
    ar: z.string().min(1, "Arabic product name is required").max(150),
  }),
  description: z.object({
    en: z.string().default(""),
    ar: z.string().default(""),
  }).optional(),
  price: z.coerce.number().nonnegative("Price must be a positive number"),
  category: objectIdSchema,
  sortOrder: z.coerce.number().int().default(0),
});

export const updateProductSchema = z.object({
  name: z.object({
    en: z.string().min(1).max(150).optional(),
    ar: z.string().min(1).max(150).optional(),
  }).optional(),
  description: z.object({
    en: z.string().optional(),
    ar: z.string().optional(),
  }).optional(),
  price: z.coerce.number().nonnegative("Price must be a positive number").optional(),
  category: objectIdSchema.optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: formBooleanOptional,
  isAvailable: formBooleanOptional,
});

export const toggleAvailabilitySchema = z.object({
  isAvailable: formBoolean,
});
