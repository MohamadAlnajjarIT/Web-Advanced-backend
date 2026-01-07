const Category = require("../models/Category");

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findBySlug(req.params.slug);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category by slug error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    const result = await Category.getProductsBySlug(
      req.params.slug,
      page,
      limit
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: {
        category: result.category,
        products: result.products,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
