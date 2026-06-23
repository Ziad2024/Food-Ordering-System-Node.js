import User from "../auth/user.model.js";
import { ApiError } from "../../shared/utils/api-error.js";

/**
 * List all users with pagination, searching, and filtering.
 */
export const getAllUsers = async ({ search, role, isActive, page = 1, limit = 10 }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;

  const query = {};

  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true" || isActive === true;
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: users,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
};

/**
 * Update user role.
 */
export const updateUserRole = async (userId, role) => {
  if (!["customer", "admin"].includes(role)) {
    throw ApiError.badRequest("Invalid role specified", "INVALID_ROLE");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { returnDocument: 'after' }
  ).select("-password");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return user;
};

/**
 * Toggle user active status.
 */
export const updateUserStatus = async (userId, isActive) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive } },
    { returnDocument: 'after' }
  ).select("-password");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return user;
};
