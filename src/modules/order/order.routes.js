import { Router } from "express";
import * as orderController from "./order.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { checkoutSchema, updateStatusSchema } from "./order.validation.js";

const router = Router();

// All order routes require authentication
router.use(protect);

// Admin-only order listing
router.get("/admin", authorize("admin"), orderController.getAdminOrders);

// Admin-only status updates
router.patch("/:id/status", authorize("admin"), validate(updateStatusSchema), orderController.updateOrderStatus);

// User endpoints
router.post("/checkout", validate(checkoutSchema), orderController.checkout);
router.get("/", orderController.getUserOrders);
router.get("/:id", orderController.getUserOrderDetails);

export default router;
