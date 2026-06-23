/**
 * Custom operational API error class.
 *
 * Distinguishes between *operational* errors (expected, safe to expose to the
 * client — e.g. 404 Not Found, 400 Bad Request) and *programmer* errors
 * (unexpected bugs that should never reach the client).
 *
 * Usage:
 *   throw new ApiError("Product not found", 404, "NOT_FOUND");
 *   throw new ApiError("Invalid or inactive category", 400, "BAD_REQUEST");
 */
export class ApiError extends Error {
  /**
   * @param {string}  message      Human-readable error message
   * @param {number}  statusCode   HTTP status code (default 500)
   * @param {string}  code         Machine-readable error code (default "INTERNAL_ERROR")
   * @param {boolean} isOperational Whether this is a known, expected error (default true)
   */
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    isOperational = true
  ) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Capture a clean V8 stack trace that excludes this constructor frame
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convenience factory methods
   */
  static badRequest(message, code = "BAD_REQUEST") {
    return new ApiError(message, 400, code);
  }

  static unauthorized(message = "Not authorized", code = "UNAUTHORIZED") {
    return new ApiError(message, 401, code);
  }

  static forbidden(message = "Access denied", code = "FORBIDDEN") {
    return new ApiError(message, 403, code);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new ApiError(message, 404, code);
  }

  static conflict(message, code = "CONFLICT_ERROR") {
    return new ApiError(message, 409, code);
  }

  static internal(message = "An internal server error occurred", code = "INTERNAL_ERROR") {
    return new ApiError(message, 500, code, false);
  }
}
