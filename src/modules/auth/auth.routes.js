import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { registerSchema, loginSchema, verifyOtpSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.validation.js";
import { authRateLimiter } from "../../middlewares/rateLimit.js";

const router = Router();

// Apply auth rate limiting and Zod request body validation to entry routes
router.post("/register", authRateLimiter, validate(registerSchema), authController.register);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post("/verify-otp", authRateLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// Rotate and clear session routes (read cookies directly)
router.post("/refresh-token", authController.refresh);
router.post("/logout", authController.logout);

// Password recovery
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

export default router;
