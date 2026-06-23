import { ApiError } from "../shared/utils/api-error.js";
import { errorResponse } from "../shared/utils/response.utils.js";

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Global Express Error Handling Middleware.
 *
 * Response shape:
 * {
 *   success:       false,
 *   message:       string,
 *   code:          string,          // machine-readable error code
 *   isOperational: boolean,         // true = known/expected, false = bug
 *   errors:        array | null,    // field-level detail (validation)
 *   stack:         string | null    // only present in development
 * }
 */
export const errorHandler = (err, req, res, next) => {
  // Always log the full error server-side
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err);

  // ── Already a structured ApiError ─────────────────────────────────────────
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      isOperational: err.isOperational,
      errors: null,
      ...(IS_DEV && { stack: err.stack }),
    });
  }

  // ── MongoDB duplicate key (code 11000) ────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] ?? "field";
    const capitalized = field.charAt(0).toUpperCase() + field.slice(1);
    const apiErr = ApiError.conflict(
      `${capitalized} is already registered. Please use another one.`
    );
    return res.status(apiErr.statusCode).json({
      success: false,
      message: apiErr.message,
      code: apiErr.code,
      isOperational: apiErr.isOperational,
      errors: null,
      ...(IS_DEV && { stack: err.stack }),
    });
  }

  // ── Mongoose validation error ─────────────────────────────────────────────
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Database validation failed",
      code: "VALIDATION_ERROR",
      isOperational: true,
      errors,
      ...(IS_DEV && { stack: err.stack }),
    });
  }

  // ── Mongoose cast error (bad ObjectId format) ─────────────────────────────
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field '${err.path}': "${err.value}"`,
      code: "BAD_REQUEST",
      isOperational: true,
      errors: null,
      ...(IS_DEV && { stack: err.stack }),
    });
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid session token. Access denied.",
      code: "UNAUTHORIZED",
      isOperational: true,
      errors: null,
      ...(IS_DEV && { stack: err.stack }),
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Session has expired. Please authenticate again.",
      code: "UNAUTHORIZED",
      isOperational: true,
      errors: null,
      ...(IS_DEV && { stack: err.stack }),
    });
  }

  // ── Unhandled / programmer error (fallback) ───────────────────────────────
  const message = IS_DEV
    ? err.message
    : "An internal server error occurred. Please try again later.";

  return res.status(500).json({
    success: false,
    message,
    code: "INTERNAL_SERVER_ERROR",
    isOperational: false,
    errors: null,
    ...(IS_DEV && { stack: err.stack }),
  });
};
