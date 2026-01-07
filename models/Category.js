const db = require("../config/database");

class Category {
  // Get all categories
  static async findAll() {
    const [rows] = await db.execute(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = 1) as product_count
      FROM categories c
      ORDER BY c.display_name
    `);
    return rows;
  }

  // Get category by slug
  static async findBySlug(slug) {
    const [rows] = await db.execute("SELECT * FROM categories WHERE slug = ?", [
      slug,
    ]);
    return rows[0];
  }

  // Get category by ID
  static async findById(id) {
    const [rows] = await db.execute("SELECT * FROM categories WHERE id = ?", [
      id,
    ]);
    return rows[0];
  }

  // Get products by category slug with pagination
  static async getProductsBySlug(slug, page = 1, limit = 12) {
    const category = await this.findBySlug(slug);
    if (!category) return null;

    const offset = (page - 1) * limit;

    const [products] = await db.execute(
      `
      SELECT p.*, pi.image_url as primary_image
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.category_id = ? AND p.is_active = 1
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [category.id, limit, offset]
    );

    const [countResult] = await db.execute(
      "SELECT COUNT(*) as total FROM products WHERE category_id = ? AND is_active = 1",
      [category.id]
    );

    return {
      category,
      products,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit),
    };
  }

  // Create new category (admin only)
  static async create(categoryData) {
    const [result] = await db.execute(
      "INSERT INTO categories (name, slug, display_name, description, image_url, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
      [
        categoryData.name,
        categoryData.slug,
        categoryData.display_name,
        categoryData.description,
        categoryData.image_url,
        categoryData.parent_id || null,
      ]
    );
    return this.findById(result.insertId);
  }

  // Update category (admin only)
  static async update(id, categoryData) {
    const fields = [];
    const values = [];

    Object.keys(categoryData).forEach((key) => {
      if (categoryData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(categoryData[key]);
      }
    });

    values.push(id);

    await db.execute(
      `UPDATE categories SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // Delete category (admin only)
  static async delete(id) {
    await db.execute("DELETE FROM categories WHERE id = ?", [id]);
    return true;
  }
}

module.exports = Category;
