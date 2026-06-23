import { Router } from "express";
import * as cartController from "./cart.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addItemSchema, updateItemSchema } from "./cart.validation.js";

const router = Router();

// Protect all cart routes
router.use(protect);

router.route("/")
  .get(cartController.getCart)
  .delete(cartController.clearCart);

router.route("/items")
  .post(validate(addItemSchema), cartController.addItem);

router.route("/items/:productId")
  .put(validate(updateItemSchema), cartController.updateItem)
  .delete(cartController.removeItem);

export default router;
