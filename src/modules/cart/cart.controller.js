import * as cartService from "./cart.service.js";
import { successResponse } from "../../shared/utils/response.utils.js";

export const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user._id);
    return successResponse(res, cart, "Cart retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const addItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.addItemToCart(req.user._id, productId, quantity);
    return successResponse(res, cart, "Item added to cart successfully");
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateItemQuantity(req.user._id, productId, quantity);
    return successResponse(res, cart, "Cart item updated successfully");
  } catch (error) {
    next(error);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await cartService.removeItemFromCart(req.user._id, productId);
    return successResponse(res, cart, "Item removed from cart successfully");
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.user._id);
    return successResponse(res, cart, "Cart cleared successfully");
  } catch (error) {
    next(error);
  }
};
