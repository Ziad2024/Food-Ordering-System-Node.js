# 🍔 Food Ordering System — Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**A production-grade REST API for a full-featured food ordering platform**

[Live API](https://foodorderingbackend-cyolimf4.b4a.run) · [Frontend Repo](https://github.com/Ziad2024/Food-ordering-system-Next.js-)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth** | Email-based registration & login with JWT access + refresh tokens (multi-device sessions) |
| 🛒 **Cart** | Persistent cart stored in MongoDB, synced across sessions |
| 📦 **Orders** | Full order lifecycle from placement through delivery |
| 💳 **Stripe Payments** | Stripe Checkout Sessions for card payments with webhook fulfillment |
| 📡 **Real-time** | Socket.IO rooms — users get live order updates, admins see new orders instantly |
| 🏪 **Admin Panel** | Full product/category CRUD, order status management, user management |
| 📊 **Analytics** | Revenue totals, top products, sales trends |
| 🖼️ **Cloudinary** | Image uploads for products and categories via Multer + Cloudinary |
| ⚡ **Redis Cache** | Product lists cached in Redis with automatic invalidation on writes |
| 🐂 **BullMQ Queue** | Stripe payment webhooks handled in a background worker queue |
| 🛡️ **Rate Limiting** | Global Express rate limiter to prevent abuse |

---

## 🏗️ Architecture

```
src/
├── app.js                        # Express app setup, middleware, route mounting
├── server.js                     # HTTP server + Socket.IO initialization
├── config/
│   ├── db.js                     # Mongoose connection
│   └── redis.js                  # Redis client
├── middlewares/
│   ├── auth.middleware.js        # JWT protect & authorize guards
│   ├── error.js                  # Global error handler
│   ├── rateLimit.js              # Express rate limiter
│   └── validate.middleware.js    # Zod schema validation
├── modules/
│   ├── auth/                     # Registration, login, OTP, refresh tokens
│   ├── cart/                     # Add/update/remove cart items
│   ├── order/                    # Checkout, order tracking, Stripe webhook
│   ├── product/                  # Products & categories CRUD + Redis cache
│   ├── admin/                    # User management (role/status)
│   └── analytics/                # Dashboard stats, sales trends
└── shared/
    ├── queue/
    │   ├── payment.queue.js      # BullMQ queue definition
    │   └── workers/
    │       └── payment.worker.js # Stripe event processor
    └── utils/
        ├── socket.js             # Socket.IO init, emitToUser, emitToAdmin
        └── api-error.js          # Centralised ApiError class
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)
- Redis instance (Upstash recommended for cloud)
- Stripe account
- Cloudinary account

### 1. Clone & Install

```bash
git clone https://github.com/Ziad2024/Food-Ordering-System-Node.js.git
cd Food-Ordering-System-Node.js
npm install
```

### 2. Environment Variables

Create a `.env` file (or `.env.production` for production runs):

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/food-ordering

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend (CORS)
FRONTEND_URL=http://localhost:3000
```

### 3. Seed the Database

```bash
node seed.js
```

This will populate **8 categories** and **40+ products** with real food photos.

### 4. Create an Admin User

```bash
node make-admin.js your@email.com
```

### 5. Run Development Server

```bash
npm run dev
```

Server starts on `http://localhost:5000`.

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`.

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login, receive tokens |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/logout` | ✅ | Logout current device |

### Products & Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | ❌ | List all active categories |
| GET | `/products` | ❌ | Paginated product list (`?category=&page=&limit=`) |
| GET | `/products/:id` | ❌ | Single product detail |
| POST | `/categories` | Admin | Create category |
| PUT | `/categories/:id` | Admin | Update category |
| DELETE | `/categories/:id` | Admin | Soft-delete category |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| PATCH | `/products/:id/availability` | Admin | Toggle availability |
| DELETE | `/products/:id` | Admin | Soft-delete product |

### Cart
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | ✅ | Get user's cart |
| POST | `/cart/items` | ✅ | Add item to cart |
| PATCH | `/cart/items/:productId` | ✅ | Update item quantity |
| DELETE | `/cart/items/:productId` | ✅ | Remove item from cart |
| DELETE | `/cart` | ✅ | Clear entire cart |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders/checkout` | ✅ | Place order (cash or Stripe redirect) |
| GET | `/orders` | ✅ | User's order history |
| GET | `/orders/:id` | ✅ | Order detail |
| GET | `/orders/admin` | Admin | All orders (paginated, filterable) |
| PATCH | `/orders/:id/status` | Admin | Update order status |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin | List all users |
| PATCH | `/admin/users/:id/role` | Admin | Change user role |
| PATCH | `/admin/users/:id/status` | Admin | Toggle active status |

---

## ⚡ Real-time Events (Socket.IO)

Clients connect to the same URL as the API. After connecting:

```js
// User joins their personal room
socket.emit('join_user_room', userId);

// Admin also joins the admin broadcast room
socket.emit('join_admin_room');
```

### Events emitted by server

| Event | Sent to | Payload |
|-------|---------|---------|
| `order_created` | Admin room | `{ order }` |
| `order_status_updated` | User room + Admin room | `{ orderId, status, paymentStatus, timeline }` |

---

## 🐳 Docker

```bash
docker build -t food-ordering-backend .
docker run -p 5000:5000 --env-file .env food-ordering-backend
```

The server binds to `0.0.0.0` for container compatibility.

---

## 🚢 Deployment

Deployed on **Back4App Containers** (Docker-based PaaS).  
Auto-deploys on every push to `main` via GitHub integration.

**Live URL:** `https://foodorderingbackend-cyolimf4.b4a.run`

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Express.js | HTTP server framework |
| Mongoose | MongoDB ODM |
| Redis / ioredis | Caching & BullMQ transport |
| BullMQ | Background job queue for Stripe webhooks |
| Socket.IO | Real-time bidirectional events |
| Stripe | Payment processing |
| Cloudinary | Image hosting |
| Multer | Multipart file handling |
| Zod | Request schema validation |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT signing & verification |
| dotenv | Environment config |
