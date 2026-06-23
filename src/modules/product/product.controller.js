import * as productService from "./product.service.js";
import { successResponse } from "../../shared/utils/response.utils.js";

/**
 * ── CATEGORY CONTROLLERS ────────────────────────────────────────────────────
 * Service throws ApiError on failure → global error handler picks it up.
 * Controllers only handle the happy path.
 */

export const getCategories = async (req, res, next) => {
  try {
    const categories = await productService.getCategories();
    return successResponse(res, categories, "Categories retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await productService.createCategory(req.body);
    return successResponse(res, category, "Category created successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await productService.updateCategory(req.params.id, req.body);
    return successResponse(res, category, "Category updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await productService.deleteCategory(req.params.id);
    return successResponse(res, null, "Category and associated products soft-deleted successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ── PRODUCT CONTROLLERS ─────────────────────────────────────────────────────
 */

export const getProducts = async (req, res, next) => {
  try {
    const { category, page, limit } = req.query;

    const result = await productService.getProducts({
      categoryId: category || null,
      page,
      limit,
    });

    return successResponse(res, result.data, "Products retrieved successfully", 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, product, "Product retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, product, "Product created successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return successResponse(res, product, "Product updated successfully");
  } catch (error) {
    next(error);
  }
};

export const toggleProductAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    const product = await productService.toggleProductAvailability(req.params.id, isAvailable);
    return successResponse(
      res,
      product,
      `Product availability updated to ${isAvailable ? "available" : "unavailable"}`
    );
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    return successResponse(res, null, "Product soft-deleted successfully");
  } catch (error) {
    next(error);
  }
};
