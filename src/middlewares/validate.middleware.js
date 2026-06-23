import { errorResponse } from "../shared/utils/response.utils.js";

/**
 * Express middleware to validate request bodies using Zod schemas
 * @param {object} schema Zod schema definition
 */
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error.issues) {
      const formattedErrors = error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return errorResponse(res, "Validation failed", "VALIDATION_ERROR", 422, formattedErrors);
    }
    return errorResponse(res, error.message, "VALIDATION_ERROR", 422);
  }
};
