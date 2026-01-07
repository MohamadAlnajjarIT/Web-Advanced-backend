const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");

// Generate session ID for guest users
const generateSessionId = () => {
  return "guest_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
};

// Get session ID from request (cookie or header)
const getSessionId = (req) => {
  return (
    req.cookies?.session_id ||
    req.headers["x-session-id"] ||
    generateSessionId()
  );
};

// Get guest cart
router.get("/", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cartData = await Cart.getCartBySessionId(sessionId);

    // Set session cookie if not set
    if (!req.cookies?.session_id) {
      res.cookie("session_id", sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
      });
    }

    res.json({
      success: true,
      data: cartData,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Add item to cart
router.post("/items", async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Guest user only
    const sessionId = getSessionId(req);
    const cart = await Cart.getOrCreateCart(null, sessionId);
    const cartId = cart.id;

    // Set session cookie if not set
    if (!req.cookies?.session_id) {
      res.cookie("session_id", sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
    }

    const cartItem = await Cart.addToCart(cartId, product_id, quantity);

    res.json({
      success: true,
      data: cartItem,
      message: "Product added to cart",
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Remove MERGE route (since no user login)

// Update cart item quantity
router.put("/items/:itemId", async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required",
      });
    }

    const updated = await Cart.updateCartItem(itemId, quantity);

    res.json({
      success: true,
      data: updated,
      message: "Cart updated",
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Remove item from cart
router.delete("/items/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    await Cart.removeFromCart(itemId);

    res.json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Clear cart
router.delete("/clear", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const cart = await Cart.getOrCreateCart(null, sessionId);
    const cartId = cart.id;

    await Cart.clearCart(cartId);

    res.json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
