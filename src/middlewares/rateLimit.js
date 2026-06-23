import rateLimit from "express-rate-limit";
import { errorResponse } from "../shared/utils/response.utils.js";

/**
 * Rate limiter specifically for high-sensitivity authentication endpoints (e.g. register, login, verification)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable legacy X-RateLimit headers
  handler: (req, res, next, options) => {
    return errorResponse(
      res,
      "Too many registration or login attempts. Please try again after 15 minutes.",
      "RATE_LIMIT_EXCEEDED",
      429
    );
  },
});

/**
 * Standard API rate limiter for general application endpoints
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    return errorResponse(
      res,
      "Too many requests from this IP. Please try again after 15 minutes.",
      "RATE_LIMIT_EXCEEDED",
      429
    );
  },
});
