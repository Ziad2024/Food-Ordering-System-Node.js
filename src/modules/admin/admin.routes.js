import { Router } from "express";
import * as adminController from "./admin.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { updateUserRoleSchema, updateUserStatusSchema } from "./admin.validation.js";

const router = Router();

// Secure all admin routes
router.use(protect);
router.use(authorize("admin"));

router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/role", validate(updateUserRoleSchema), adminController.updateUserRole);
router.patch("/users/:id/status", validate(updateUserStatusSchema), adminController.updateUserStatus);

export default router;
