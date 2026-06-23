import Cart from "./cart.model.js";
import Product from "../product/product.model.js";
import { ApiError } from "../../shared/utils/api-error.js";

/**
 * Retrieve the user's cart, populating product information.
 * If the cart doesn't exist, it creates one.
 */
export const getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name price image isActive isAvailable category",
    populate: { path: "category", select: "name" }
  });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  // Filter out items where product has been completely deleted from the database
  const originalLength = cart.items.length;
  cart.items = cart.items.filter(item => item.product !== null);
  
  if (cart.items.length !== originalLength) {
    await cart.save();
  }

  return cart;
};

/**
 * Add an item or increment its quantity.
 */
export const addItemToCart = async (userId, productId, quantity = 1) => {
  // 1. Verify product exists, is active, and is available
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw ApiError.notFound("Product not found or has been deactivated");
  }
  if (!product.isAvailable) {
    throw ApiError.badRequest("Product is currently out of stock/unavailable", "PRODUCT_UNAVAILABLE");
  }

  // Ensure cart exists first
  await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, returnDocument: 'after' }
  );

  // 2. Try to increment the quantity if the product is already in the cart
  let cart = await Cart.findOneAndUpdate(
    { user: userId, "items.product": productId },
    { $inc: { "items.$.quantity": quantity } },
    { returnDocument: 'after' }
  );

  // 3. If item was not in cart, push a new item to the items array
  if (!cart) {
    cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $push: { items: { product: productId, quantity } } },
      { returnDocument: 'after' }
    );
  }

  return getCart(userId);
};

/**
 * Set the exact quantity of an item.
 */
export const updateItemQuantity = async (userId, productId, quantity) => {
  if (quantity === 0) {
    return removeItemFromCart(userId, productId);
  }

  // Verify product exists and is active
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw ApiError.notFound("Product not found or has been deactivated");
  }

  // Ensure cart exists
  await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, returnDocument: 'after' }
  );

  // Update quantity of existing item
  let cart = await Cart.findOneAndUpdate(
    { user: userId, "items.product": productId },
    { $set: { "items.$.quantity": quantity } },
    { returnDocument: 'after' }
  );

  // If item was not in the cart, add it
  if (!cart) {
    if (!product.isAvailable) {
      throw ApiError.badRequest("Product is currently out of stock/unavailable", "PRODUCT_UNAVAILABLE");
    }
    cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $push: { items: { product: productId, quantity } } },
      { returnDocument: 'after' }
    );
  }

  return getCart(userId);
};

/**
 * Remove an item from the cart.
 */
export const removeItemFromCart = async (userId, productId) => {
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $pull: { items: { product: productId } } },
    { returnDocument: 'after' }
  );

  if (!cart) {
    throw ApiError.notFound("Cart not found");
  }

  return getCart(userId);
};

/**
 * Clear the entire cart.
 */
export const clearCart = async (userId) => {
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
    { returnDocument: 'after' }
  );

  if (!cart) {
    throw ApiError.notFound("Cart not found");
  }

  return cart;
};
