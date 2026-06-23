import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import productRoutes from "./modules/product/product.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import orderRoutes from "./modules/order/order.routes.js";
import paymentRoutes from "./modules/order/payment.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import { errorHandler } from "./middlewares/error.js";
import { globalRateLimiter } from "./middlewares/rateLimit.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// Stripe webhook requires raw body, so we define it before express.json()
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(cookieParser());

// Apply global rate limiting
app.use("/api", globalRateLimiter);

// Auth Routes
app.use("/api/v1/auth", authRoutes);

// Product & Category Routes
app.use("/api/v1", productRoutes);

// Cart Routes
app.use("/api/v1/cart", cartRoutes);

// Order Routes
app.use("/api/v1/orders", orderRoutes);

// Payment Routes
app.use("/api/v1/payments", paymentRoutes);

// Admin Routes
app.use("/api/v1/admin", adminRoutes);

// Analytics Routes
app.use("/api/v1/analytics", analyticsRoutes);

app.get("/", (req, res) => {
    res.json({ message: "API Running" });
});

// Global Error Handler Middleware (MUST be defined last)
app.use(errorHandler);

export default app;