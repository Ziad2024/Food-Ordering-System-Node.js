import { z } from "zod";

/**
 * Zod validation schema for user registration request body
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(60, "Name cannot exceed 60 characters"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .min(8, "Phone number must be at least 8 characters")
      .max(20, "Phone number is too long"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Zod validation schema for credentials login request body (Step 1)
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password is required"),
});

/**
 * Zod validation schema for OTP verification request body (Step 2)
 */
export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 characters"),
  deviceIdentifier: z.string().min(1, "Device identifier is required"),
});

/**
 * Zod validation schema for forgot password request body
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Zod validation schema for reset password request body
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
