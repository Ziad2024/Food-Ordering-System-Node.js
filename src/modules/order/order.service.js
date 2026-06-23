import Stripe from "stripe";
import Order from "./order.model.js";
import Cart from "../cart/cart.model.js";
import Product from "../product/product.model.js";
import User from "../auth/user.model.js";
import { ApiError } from "../../shared/utils/api-error.js";
import emailQueue from "../../shared/queue/email.queue.js";
import { emitToAdmin, emitToUser } from "../../shared/utils/socket.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "mock_secret");

/**
 * Checkout user's cart and create an order (cash or card).
 */
export const checkout = async (userId, checkoutData) => {
  const { paymentMethod, address } = checkoutData;

  // 1. Fetch user's cart
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest("Your cart is empty", "EMPTY_CART");
  }

  // Fetch the user to get their email and name
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // 2. Validate products and calculate total
  const orderItems = [];
  let totalAmount = 0;

  for (const item of cart.items) {
    const product = await Product.findOne({ _id: item.product, isActive: true });
    if (!product) {
      throw ApiError.badRequest(`Product in cart is no longer active or exists`, "PRODUCT_INACTIVE");
    }
    if (!product.isAvailable) {
      throw ApiError.badRequest(`Product "${product.name.en}" is out of stock`, "PRODUCT_UNAVAILABLE");
    }

    const price = product.price;
    const quantity = item.quantity;
    totalAmount += price * quantity;

    orderItems.push({
      product: product._id,
      name: {
        en: product.name.en,
        ar: product.name.ar,
      },
      price,
      quantity,
    });
  }

  // 3. Determine status and timeline based on payment method
  const initialStatus = paymentMethod === "cash" ? "confirmed" : "pending_payment";
  const initialPaymentStatus = "pending";

  const order = new Order({
    user: userId,
    items: orderItems,
    totalAmount,
    paymentMethod,
    paymentStatus: initialPaymentStatus,
    status: initialStatus,
    address,
    timeline: [
      {
        status: initialStatus,
        description: paymentMethod === "cash" ? "Order placed using Cash on Delivery" : "Order placed, awaiting card payment",
      },
    ],
  });

  await order.save();

  // 4. Handle COD vs Card
  if (paymentMethod === "cash") {
    // Clear user's cart
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

    // Queue email confirmation
    await emailQueue.add("orderConfirmation", {
      to: user.email,
      name: user.name,
      orderId: order._id.toString(),
      totalAmount,
      items: orderItems.map(item => ({
        name: item.name.en,
        price: item.price,
        quantity: item.quantity
      })),
      paymentMethod: "Cash on Delivery",
    });

    // Notify Admins
    emitToAdmin("order_created", { order });

    return { order, checkoutUrl: null };
  } else {
    // Card: Create Stripe Session
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: orderItems.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name.en,
              description: item.name.ar,
            },
            unit_amount: Math.round(item.price * 100), // In cents
          },
          quantity: item.quantity,
        })),
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/checkout/success?orderId=${order._id}`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/checkout/cancel?orderId=${order._id}`,
        metadata: {
          orderId: order._id.toString(),
        },
      });

      order.stripeSessionId = session.id;
      await order.save();

      // Clear user's cart
      await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

      return { order, checkoutUrl: session.url };
    } catch (stripeError) {
      // If Stripe session creation fails, cancel the order to avoid orphan orders
      order.status = "cancelled";
      order.timeline.push({
        status: "cancelled",
        description: `Stripe checkout initiation failed: ${stripeError.message}`,
      });
      await order.save();

      throw ApiError.internal(`Stripe checkout error: ${stripeError.message}`);
    }
  }
};

/**
 * Get user's order history.
 */
export const getUserOrders = async (userId) => {
  return Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
};

/**
 * Get user's order details.
 */
export const getUserOrderDetails = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId }).lean();
  if (!order) {
    throw ApiError.notFound("Order not found");
  }
  return order;
};

/**
 * Get all orders (Admin only, paginated and filtered).
 */
export const getAdminOrders = async ({ status, paymentStatus, paymentMethod, page = 1, limit = 10 } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;

  const query = {};
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: orders,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
};

/**
 * Update order status (Admin only).
 */
export const updateOrderStatus = async (orderId, status, description) => {
  const order = await Order.findById(orderId).populate("user", "name email");
  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  // Prevent updates to already cancelled or delivered orders
  if (["cancelled", "delivered"].includes(order.status)) {
    throw ApiError.badRequest(`Cannot update order in ${order.status} state`, "INVALID_STATE_TRANSITION");
  }

  // Update order status
  order.status = status;
  
  // If payment status was pending and now it's delivered with COD (cash), mark paymentStatus as paid
  if (status === "delivered" && order.paymentMethod === "cash" && order.paymentStatus === "pending") {
    order.paymentStatus = "paid";
  }

  // If status is cancelled, set paymentStatus to failed if it wasn't paid
  if (status === "cancelled" && order.paymentStatus === "pending") {
    order.paymentStatus = "failed";
  }

  // Add to timeline
  order.timeline.push({
    status,
    description: description || `Order status updated to ${status.replace(/_/g, ' ')}`,
  });

  await order.save();

  // Send real-time update
  emitToUser(order.user._id, "order_status_updated", {
    orderId: order._id,
    status,
    paymentStatus: order.paymentStatus,
    description: order.timeline[order.timeline.length - 1].description,
    timeline: order.timeline
  });

  emitToAdmin("order_status_updated", {
    orderId: order._id,
    status,
    paymentStatus: order.paymentStatus,
  });

  return order;
};

/**
 * Verify Stripe webhook signature and construct event.
 */
export const verifyWebhook = (rawBody, signature) => {
  try {
    // If we're in development and using the mock secret, allow bypassing real signature verification
    if (
      process.env.NODE_ENV === "development" &&
      (process.env.STRIPE_WEBHOOK_SECRET === "whsec_mock_webhook_secret" || !signature)
    ) {
      console.log("[Webhook] Development mode: Bypassing signature verification and parsing raw body directly.");
      return JSON.parse(rawBody.toString());
    }

    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || "mock_webhook_secret"
    );
  } catch (err) {
    // Fallback for development if signature verification fails but we want to allow testing
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Webhook] Signature verification failed (${err.message}). Falling back to direct JSON parse for development testing.`);
      try {
        return JSON.parse(rawBody.toString());
      } catch (parseErr) {
        throw ApiError.badRequest("Invalid JSON body", "INVALID_JSON");
      }
    }
    throw ApiError.badRequest(`Stripe Webhook Signature verification failed: ${err.message}`, "WEBHOOK_VERIFICATION_FAILED");
  }
};


