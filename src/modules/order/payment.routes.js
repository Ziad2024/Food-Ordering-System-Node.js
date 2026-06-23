import { Router } from "express";
import { stripeWebhook } from "./order.controller.js";

const router = Router();

// Stripe Webhook needs raw body, no auth
router.post("/webhook", stripeWebhook);

export default router;
