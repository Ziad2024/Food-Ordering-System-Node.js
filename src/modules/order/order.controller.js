import * as orderService from "./order.service.js";
import { successResponse } from "../../shared/utils/response.utils.js";
import paymentQueue from "../../shared/queue/payment.queue.js";

export const checkout = async (req, res, next) => {
  try {
    const result = await orderService.checkout(req.user._id, req.body);
    return successResponse(res, result, "Order placed successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getUserOrders(req.user._id);
    return successResponse(res, orders, "Orders retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getUserOrderDetails = async (req, res, next) => {
  try {
    const order = await orderService.getUserOrderDetails(req.user._id, req.params.id);
    return successResponse(res, order, "Order details retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, paymentMethod, page, limit } = req.query;
    const result = await orderService.getAdminOrders({
      status,
      paymentStatus,
      paymentMethod,
      page,
      limit,
    });
    return successResponse(res, result.data, "Admin orders retrieved successfully", 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, description } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status, description);
    return successResponse(res, order, "Order status updated successfully");
  } catch (error) {
    next(error);
  }
};

// Stripe event types we handle in the payment worker
const HANDLED_STRIPE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
]);

export const stripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];
    const event = orderService.verifyWebhook(req.body, signature);

    if (HANDLED_STRIPE_EVENTS.has(event.type)) {
      // Enqueue for async processing — respond to Stripe immediately
      await paymentQueue.add("processWebhook", { event });
      console.log(`[Webhook] Enqueued event "${event.type}" (id: ${event.id})`);
    } else {
      console.log(`[Webhook] Ignored unhandled event type: "${event.type}"`);
    }

    // Must always return 200 to Stripe — even for ignored events
    return res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

