import { Router } from "express";
import * as analyticsController from "./analytics.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Secure all analytics routes to admin
router.use(protect);
router.use(authorize("admin"));

router.get("/dashboard", analyticsController.getDashboardSummary);
router.get("/sales-trends", analyticsController.getSalesTrends);
router.get("/top-products", analyticsController.getTopSellingProducts);

export default router;
