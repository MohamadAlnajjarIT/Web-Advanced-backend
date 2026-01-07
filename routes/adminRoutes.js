const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const adminController = require("../controllers/adminController");

// Admin authentication middleware (simple password check)
const adminAuth = (req, res, next) => {
  const adminPassword = req.headers["x-admin-password"];

  if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  next();
};

// Apply admin auth to all routes
router.use(adminAuth);
router.get("/search", adminController.search);

// ========== ORDERS ==========
// Get all orders
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.getAll();
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get orders",
    });
  }
});

// Get order by ID
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order",
    });
  }
});

// Update order status
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const updatedOrder = await Order.updateStatus(req.params.id, status);

    res.json({
      success: true,
      data: updatedOrder,
      message: "Order status updated",
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
});

// ========== PRODUCTS ==========
// Get all products (admin view)
router.get("/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const products = await Product.findAllAdmin(page, limit);

    res.json({
      success: true,
      data: products.products,
      pagination: {
        page: products.page,
        limit: products.limit,
        total: products.total,
        totalPages: products.totalPages,
      },
    });
  } catch (error) {
    console.error("Get products admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get products",
    });
  }
});

// Create new product
router.post("/products", async (req, res) => {
  try {
    const productData = req.body;

    // Validate required fields
    if (!productData.name || !productData.price || !productData.category_id) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and category are required",
      });
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
});

// Update product
router.put("/products/:id", async (req, res) => {
  try {
    const productData = req.body;
    const productId = req.params.id;

    const updatedProduct = await Product.update(productId, productData);

    res.json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
});

// Delete product
router.delete("/products/:id", async (req, res) => {
  try {
    await Product.delete(req.params.id);

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
});

// ========== CATEGORIES ==========
// Get all categories (admin)
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get categories",
    });
  }
});

// Create category
router.post("/categories", async (req, res) => {
  try {
    const categoryData = req.body;

    if (!categoryData.name || !categoryData.slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
});

// Update category
router.put("/categories/:id", async (req, res) => {
  try {
    const categoryData = req.body;
    const updatedCategory = await Category.update(req.params.id, categoryData);

    res.json({
      success: true,
      data: updatedCategory,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
});

// Delete category
router.delete("/categories/:id", async (req, res) => {
  try {
    await Category.delete(req.params.id);

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
});

// ========== DASHBOARD STATS ==========
router.get("/stats", async (req, res) => {
  try {
    const stats = await Order.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard stats",
    });
  }
});

module.exports = router;
