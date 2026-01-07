const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// Create new order (for checkout)
router.post("/", async (req, res) => {
  try {
    const orderData = req.body;

    console.log("Creating order with data:", {
      order_number: orderData.order_number,
      customer: orderData.customer?.full_name,
      items_count: orderData.items?.length,
    });

    // Validate required fields
    if (
      !orderData.order_number ||
      !orderData.customer ||
      !orderData.items ||
      !orderData.total_amount
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required order information",
        required: ["order_number", "customer", "items", "total_amount"],
        received: {
          has_order_number: !!orderData.order_number,
          has_customer: !!orderData.customer,
          has_items: !!orderData.items?.length > 0,
          has_total: !!orderData.total_amount,
        },
      });
    }

    // Validate customer data
    if (
      !orderData.customer.full_name ||
      !orderData.customer.email ||
      !orderData.customer.phone ||
      !orderData.customer.address
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing customer information",
        required: ["full_name", "email", "phone", "address"],
      });
    }

    // Validate items
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must have at least one item",
      });
    }

    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get order by order number (for order tracking)
router.get("/:orderNumber", async (req, res) => {
  try {
    const order = await Order.findByOrderNumber(req.params.orderNumber);

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

module.exports = router;
