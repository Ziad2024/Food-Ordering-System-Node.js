import * as adminService from "./admin.service.js";
import { successResponse } from "../../shared/utils/response.utils.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, isActive, page, limit } = req.query;
    const result = await adminService.getAllUsers({ search, role, isActive, page, limit });
    return successResponse(res, result.data, "Users retrieved successfully", 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await adminService.updateUserRole(req.params.id, role);
    return successResponse(res, user, "User role updated successfully");
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await adminService.updateUserStatus(req.params.id, isActive);
    return successResponse(res, user, "User status updated successfully");
  } catch (error) {
    next(error);
  }
};
