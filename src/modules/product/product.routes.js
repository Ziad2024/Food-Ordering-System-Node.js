import { Router } from "express";
import * as productController from "./product.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { parseForm, uploadToCloudinary } from "../../shared/middlewares/upload.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  toggleAvailabilitySchema,
} from "./product.validation.js";

const router = Router();

/**
 * --- CATEGORY ROUTES ---
 */

// Public routes
router.get("/categories", productController.getCategories);

// Admin-only routes
router.post(
  "/categories",
  protect,
  authorize("admin"),
  parseForm("image"),
  validate(createCategorySchema),
  uploadToCloudinary("categories"),
  productController.createCategory
);

router.put(
  "/categories/:id",
  protect,
  authorize("admin"),
  parseForm("image"),
  validate(updateCategorySchema),
  uploadToCloudinary("categories"),
  productController.updateCategory
);

router.delete(
  "/categories/:id",
  protect,
  authorize("admin"),
  productController.deleteCategory
);

/**
 * --- PRODUCT ROUTES ---
 */

// Public routes
router.get("/products", productController.getProducts);
router.get("/products/:id", productController.getProductById);

// Admin-only routes
router.post(
  "/products",
  protect,
  authorize("admin"),
  parseForm("image"),
  validate(createProductSchema),
  uploadToCloudinary("products"),
  productController.createProduct
);

router.put(
  "/products/:id",
  protect,
  authorize("admin"),
  parseForm("image"),
  validate(updateProductSchema),
  uploadToCloudinary("products"),
  productController.updateProduct
);

router.patch(
  "/products/:id/availability",
  protect,
  authorize("admin"),
  validate(toggleAvailabilitySchema),
  productController.toggleProductAvailability
);

router.delete(
  "/products/:id",
  protect,
  authorize("admin"),
  productController.deleteProduct
);

export default router;
