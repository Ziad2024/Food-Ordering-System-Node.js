import { Worker } from "bullmq";
import { redisConfig } from "../../../config/redis.js";
import Order from "../../../modules/order/order.model.js";
import emailQueue from "../email.queue.js";
import { emitToAdmin, emitToUser } from "../../utils/socket.js";

const paymentWorker = new Worker(
  "payment",
  async (job) => {
    const { event } = job.data;
    const eventType = event.type;
    const session = event.data.object;

    console.log(`[PaymentWorker] Processing job ${job.id} — event: "${eventType}"`);

    // ─────────────────────────────────────────────────────────
    // EVENT: checkout.session.completed → confirm payment
    // ─────────────────────────────────────────────────────────
    if (eventType === "checkout.session.completed") {
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        console.warn(`[PaymentWorker] No orderId in session metadata. Skipping.`);
        return;
      }

      const order = await Order.findById(orderId).populate("user", "name email");
      if (!order) {
        console.error(`[PaymentWorker] Order "${orderId}" not found. Skipping.`);
        return;
      }

      // ── Idempotency guard: do NOT process twice ──
      if (order.paymentStatus === "paid") {
        console.log(`[PaymentWorker] Order "${orderId}" already paid. Skipping duplicate webhook.`);
        return;
      }

      order.status = "confirmed";
      order.paymentStatus = "paid";
      order.paidAt = new Date();
      order.timeline.push({
        status: "confirmed",
        description: "Payment confirmed via Stripe Card",
      });

      await order.save();

      // Real-time: notify user + admin
      emitToUser(order.user._id, "order_status_updated", {
        orderId: order._id,
        status: "confirmed",
        description: "Payment confirmed via Stripe Card",
        timeline: order.timeline
      });
      emitToUser(order.user._id, "payment_confirmed", {
        orderId: order._id,
        status: "confirmed",
        paymentStatus: "paid",
      });
      emitToAdmin("order_created", { order });

      // Queue confirmation email
      await emailQueue.add("orderConfirmation", {
        to: order.user.email,
        name: order.user.name,
        orderId: order._id.toString(),
        totalAmount: order.totalAmount,
        items: order.items.map((item) => ({
          name: item.name.en,
          price: item.price,
          quantity: item.quantity,
        })),
        paymentMethod: "Stripe Card",
      });

      console.log(`[PaymentWorker] Order "${orderId}" confirmed and paid successfully.`);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // EVENT: checkout.session.expired → cancel order
    // ─────────────────────────────────────────────────────────
    if (eventType === "checkout.session.expired") {
      const orderId = session.metadata?.orderId;
      if (!orderId) return;

      const order = await Order.findById(orderId).populate("user", "name email");
      if (!order) return;

      // Only cancel if still in pending_payment state
      if (order.status !== "pending_payment") {
        console.log(`[PaymentWorker] Order "${orderId}" not in pending_payment. Skip expired event.`);
        return;
      }

      order.status = "cancelled";
      order.paymentStatus = "failed";
      order.timeline.push({
        status: "cancelled",
        description: "Payment session expired. Order cancelled automatically.",
      });

      await order.save();

      // Notify user their session expired
      emitToUser(order.user._id, "payment_failed", {
        orderId: order._id,
        reason: "Your payment session has expired. Please place a new order.",
      });

      console.log(`[PaymentWorker] Order "${orderId}" cancelled due to expired Stripe session.`);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // EVENT: payment_intent.payment_failed → cancel order
    // ─────────────────────────────────────────────────────────
    if (eventType === "payment_intent.payment_failed") {
      const paymentIntentId = session.id;
      const failureMessage = session.last_payment_error?.message || "Payment failed";

      // Find by stripeSessionId is not possible here (PI ≠ session),
      // so we look up by status and match via payment_intent field if stored.
      // For now: log and let session.expired handle cancellation.
      console.warn(`[PaymentWorker] payment_intent.payment_failed for PI "${paymentIntentId}": ${failureMessage}`);
      return;
    }

    // ─────────────────────────────────────────────────────────
    // Unhandled event type — log and skip
    // ─────────────────────────────────────────────────────────
    console.log(`[PaymentWorker] Unhandled event type "${eventType}". Skipping.`);
  },
  {
    connection: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs for inspection
    },
  }
);

paymentWorker.on("completed", (job) => {
  console.log(`[PaymentWorker] Job ${job.id} completed successfully.`);
});

paymentWorker.on("failed", (job, err) => {
  console.error(`[PaymentWorker] Job ${job.id} failed:`, err.message);
});

export default paymentWorker;
