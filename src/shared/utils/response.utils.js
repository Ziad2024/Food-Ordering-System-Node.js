/**
 * Standardized success response structure.
 *
 * @param {object} res         Express response object
 * @param {any}    data        Response payload data
 * @param {string} message     Optional success message
 * @param {number} statusCode  HTTP status code (default 200)
 * @param {object} meta        Optional metadata (e.g. pagination info)
 */
export const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = 200,
  meta = null
) => {
  const body = {
    success: true,
    message,
    data,
  };

  if (meta) {
    Object.assign(body, meta);
  }

  return res.status(statusCode).json(body);
};

/**
 * Standardized error response structure.
 *
 * @param {object}       res         Express response object
 * @param {string}       message     Error description message
 * @param {string}       errorCode   Machine-readable error code (e.g. "VALIDATION_ERROR")
 * @param {number}       statusCode  HTTP status code (default 500)
 * @param {Array|null}   errors      Optional field-level error detail
 */
export const errorResponse = (
  res,
  message = "An error occurred",
  errorCode = "INTERNAL_ERROR",
  statusCode = 500,
  errors = null
) => {
  const body = {
    success: false,
    message,
    code: errorCode,
  };

  if (errors) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
};
