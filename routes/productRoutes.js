const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// Public routes - no authentication required
router.get("/", productController.getAllProducts);
router.get("/featured", productController.getFeaturedProducts);
router.get("/search", productController.searchProducts);
router.get("/:id", productController.getProductById);
router.get("/slug/:slug", productController.getProductBySlug);

module.exports = router;
