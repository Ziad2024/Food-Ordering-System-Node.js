import Category from "./category.model.js";
import Product from "./product.model.js";
import redisClient from "../../config/redis.js";
import { ApiError } from "../../shared/utils/api-error.js";

// ── Cache Keys & TTLs ─────────────────────────────────────────────────────────
const CACHE_KEYS = {
  CATEGORIES_ALL: "categories:all",
  PRODUCTS_ALL:   "products:all",
  PRODUCT_SINGLE:          (id)    => `products:${id}`,
  PRODUCTS_BY_CATEGORY:    (catId) => `products:cat:${catId}`,
  PRODUCTS_PAGINATED:      (page, limit, catId) =>
    catId
      ? `products:page:${page}:limit:${limit}:cat:${catId}`
      : `products:page:${page}:limit:${limit}`,
};

const TTL = {
  CATEGORIES: 1800, // 30 min
  PRODUCTS:   600,  // 10 min
};

// ── Cache invalidation ────────────────────────────────────────────────────────
const clearAllProductCaches = async () => {
  try {
    await redisClient.del(CACHE_KEYS.CATEGORIES_ALL);
    const keys = await redisClient.keys("products:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CATEGORY SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

export const getCategories = async () => {
  const cached = await redisClient.get(CACHE_KEYS.CATEGORIES_ALL);
  if (cached) return JSON.parse(cached);

  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

  await redisClient.setex(CACHE_KEYS.CATEGORIES_ALL, TTL.CATEGORIES, JSON.stringify(categories));
  return categories;
};

// ... category writers omit ...

// (rest of category code remains unmodified)
export const createCategory = async (categoryData) => {
  const category = await Category.create(categoryData);
  await clearAllProductCaches();
  return category;
};

export const updateCategory = async (id, updateData) => {
  const category = await Category.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  );

  if (!category) {
    throw ApiError.notFound("Category not found or inactive");
  }

  await clearAllProductCaches();
  return category;
};

export const deleteCategory = async (id) => {
  const category = await Category.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: { isActive: false } },
    { returnDocument: 'after' }
  );

  if (!category) {
    throw ApiError.notFound("Category not found or already deleted");
  }

  // Cascade soft-delete to child products
  await Product.updateMany(
    { category: id, isActive: true },
    { $set: { isActive: false } }
  );

  await clearAllProductCaches();
  return category;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCT SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get paginated list of active products.
 *
 * @param {object} opts
 * @param {string|null} opts.categoryId  Filter by category ObjectId
 * @param {number}      opts.page        1-based page number (default 1)
 * @param {number}      opts.limit       Items per page (default 10, max 50)
 * @returns {{ data: Product[], pagination: object }}
 */
export const getProducts = async ({ categoryId = null, page = 1, limit = 10 } = {}) => {
  // Clamp values
  const safePage  = Math.max(1, parseInt(page, 10)  || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip      = (safePage - 1) * safeLimit;

  const cacheKey = CACHE_KEYS.PRODUCTS_PAGINATED(safePage, safeLimit, categoryId);

  // Try cache
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const query = { isActive: true };
  if (categoryId) query.category = categoryId;

  // Run both queries in parallel
  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name image")
      .sort({ sortOrder: 1, _id: 1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Product.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / safeLimit);

  const result = {
    data: products,
    pagination: {
      total,
      page:      safePage,
      limit:     safeLimit,
      totalPages,
      hasNext:   safePage < totalPages,
      hasPrev:   safePage > 1,
    },
  };

  await redisClient.setex(cacheKey, TTL.PRODUCTS, JSON.stringify(result));
  return result;
};

export const getProductById = async (id) => {
  const cacheKey = CACHE_KEYS.PRODUCT_SINGLE(id);

  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const product = await Product.findOne({ _id: id, isActive: true })
    .populate("category", "name image")
    .lean();

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  await redisClient.setex(cacheKey, TTL.PRODUCTS, JSON.stringify(product));
  return product;
};

export const createProduct = async (productData) => {
  const categoryExists = await Category.findOne({
    _id: productData.category,
    isActive: true,
  });
  if (!categoryExists) {
    throw ApiError.badRequest("Invalid or inactive category specified", "INVALID_CATEGORY");
  }

  const product  = await Product.create(productData);
  const populated = await Product.findById(product._id).populate("category", "name image");

  await clearAllProductCaches();
  return populated;
};

export const updateProduct = async (id, updateData) => {
  if (updateData.category) {
    const categoryExists = await Category.findOne({
      _id: updateData.category,
      isActive: true,
    });
    if (!categoryExists) {
      throw ApiError.badRequest("Invalid or inactive category specified", "INVALID_CATEGORY");
    }
  }

  const product = await Product.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  ).populate("category", "name image");

  if (!product) {
    throw ApiError.notFound("Product not found or inactive");
  }

  await clearAllProductCaches();
  return product;
};

export const toggleProductAvailability = async (id, isAvailable) => {
  const product = await Product.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: { isAvailable } },
    { returnDocument: 'after' }
  ).populate("category", "name image");

  if (!product) {
    throw ApiError.notFound("Product not found or inactive");
  }

  await clearAllProductCaches();
  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: { isActive: false } },
    { returnDocument: 'after' }
  );

  if (!product) {
    throw ApiError.notFound("Product not found or already deleted");
  }

  await clearAllProductCaches();
  return product;
};
