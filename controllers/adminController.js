const Product = require("../models/Product");
const Order = require("../models/Order");

exports.search = async (req, res) => {
  try {
    const query = req.query.q;
    const type = req.query.type || "products";

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchQuery = query.trim();

    switch (type) {
      case "products":
        // Search products
        const productResults = await Product.search(searchQuery, 1, 100);
        return res.json({
          success: true,
          data: productResults.products,
          count: productResults.total,
          type: "products",
        });

      case "orders":
        // Search orders
        const orderResults = await Order.search(searchQuery, 1, 100);
        return res.json({
          success: true,
          data: orderResults.orders,
          count: orderResults.total,
          type: "orders",
        });

      case "customers":
        // Search customers (through orders)
        const customerResults = await Order.searchByCustomer(searchQuery, 1, 100);
        return res.json({
          success: true,
          data: customerResults.orders,
          count: customerResults.total,
          type: "customers",
        });

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid search type",
        });
    }
  } catch (error) {
    console.error("Admin search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search",
    });
  }
};