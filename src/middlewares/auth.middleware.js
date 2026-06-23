import { verifyAccessToken } from "../shared/utils/jwt.utils.js";
import User from "../modules/auth/user.model.js";
import { errorResponse } from "../shared/utils/response.utils.js";

/**
 * Middleware to protect routes by validating JWT access tokens
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Not authorized, no token provided", "UNAUTHORIZED", 401);
    }

    try {
      const decoded = verifyAccessToken(token);

      // Verify user exists and is active
      const user = await User.findById(decoded.sub).select("-password");
      if (!user) {
        return errorResponse(res, "User associated with this token not found", "UNAUTHORIZED", 401);
      }

      if (!user.isActive) {
        return errorResponse(res, "User account is deactivated", "ACCOUNT_DEACTIVATED", 403);
      }

      req.user = user;
      next();
    } catch (jwtError) {
      return errorResponse(res, "Not authorized, token invalid or expired", "UNAUTHORIZED", 401);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware for Role-Based Access Control (RBAC)
 * @param {...string} roles Allowed roles for the route
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `User role '${req.user?.role || "guest"}' is not authorized to access this resource`,
        "FORBIDDEN",
        403
      );
    }
    next();
  };
};
