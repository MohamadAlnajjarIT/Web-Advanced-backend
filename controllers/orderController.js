const Order = require("../models/Order");
const Cart = require("../models/Cart");

exports.createOrder = async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id || req.headers["x-session-id"];

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Get cart items
    const cartData = await Cart.getCartBySessionId(sessionId);

    if (!cartData.items || cartData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Validate order data
    const {
      full_name,
      email,
      phone,
      address,
      city,
      country,
      payment_method,
      notes,
    } = req.body;

    if (!full_name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Full name, phone, and address are required",
      });
    }

    // Calculate totals
    const subtotal = cartData.items.reduce((total, item) => {
      return total + parseFloat(item.price) * (item.quantity || 1);
    }, 0);

    const shipping_fee = subtotal >= 50 ? 0 : 5; // Free shipping over $50
    const tax_rate = 0.11; // 11% VAT for Lebanon
    const tax_amount = subtotal * tax_rate;
    const total_amount = subtotal + shipping_fee + tax_amount;

    // Create order data
    const orderData = {
      full_name,
      email: email || null,
      phone,
      address,
      city: city || "",
      country: country || "Lebanon",
      payment_method: payment_method || "cash_on_delivery",
      subtotal,
      shipping_fee,
      tax_amount,
      total_amount,
      notes: notes || "",
    };

    // Create order
    const order = await Order.create(orderData, cartData.items, sessionId);

    // Clear the cart after successful order
    await Cart.clearCart(cartData.cart_id);

    res.status(201).json({
      success: true,
      data: {
        order_number: order.order_number,
        order_id: order.id,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        order_status: order.order_status,
        created_at: order.created_at,
      },
      message: "Order created successfully!",
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order. Please try again.",
    });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.getOrderDetails(orderNumber);

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
    console.error("Get order details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
    });
  }
};

exports.getOrderBySession = async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id || req.headers["x-session-id"];

    if (!sessionId) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const orders = await Order.findBySessionId(sessionId);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get order by session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};
