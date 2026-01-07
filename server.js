const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "MF Home Essentials API",
  });
});

// Test endpoint - ONLY ONE (remove the duplicate below)
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    endpoints: {
      products: "/api/products",
      categories: "/api/categories",
      cart: "/api/cart",
      orders: "/api/orders",
      admin: "/api/admin",
    },
  });
});

// Import routes
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Use routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

console.log("✅ All routes loaded successfully");

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    requestedUrl: req.originalUrl,
    availableEndpoints: {
      products: [
        "GET /",
        "GET /featured",
        "GET /search",
        "GET /:id",
        "GET /slug/:slug",
      ],
      categories: ["GET /", "GET /:slug", "GET /:slug/products"],
      cart: [
        "GET /",
        "POST /items",
        "PUT /items/:itemId",
        "DELETE /items/:itemId",
        "DELETE /clear",
      ],
      orders: ["POST /", "GET /:orderNumber"],
      admin: [
        "POST /orders",
        "GET /orders",
        "GET /products",
        "GET /categories",
      ],
    },
  });
});

// 404 handler for non-API routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err.message);
  console.error("🔥 Stack trace:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📚 API Documentation:`);
  console.log(`   GET  /api/products - Get all products`);
  console.log(`   GET  /api/products/featured - Get featured products`);
  console.log(`   GET  /api/products/search - Search products`);
  console.log(`   GET  /api/categories - Get all categories`);
  console.log(`   GET  /api/cart - Get cart (guest session)`);
  console.log(`   POST /api/cart/items - Add to cart`);
  console.log(`   POST /api/orders - Create new order`);
  console.log(`   GET  /api/orders/:orderNumber - Get order details`);
  console.log(`   GET  /api/admin/orders - Get all orders (admin)`);
  console.log(`   GET  /api/admin/products - Get all products (admin)`);
});
