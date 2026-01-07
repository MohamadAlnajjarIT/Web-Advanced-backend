const db = require("../config/database");

class Product {
  // Get all products with pagination
  static async findAll(page = 1, limit = 10, categoryId = null) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.is_active = 1
    `;

    const params = [];

    if (categoryId) {
      query += " AND p.category_id = ?";
      params.push(categoryId);
    }

    query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [products] = await db.execute(query, params);

    // Get total count
    let countQuery =
      "SELECT COUNT(*) as total FROM products WHERE is_active = 1";
    if (categoryId) {
      countQuery += " AND category_id = ?";
      params.pop();
      params.pop(); // Remove limit and offset
      var countParams = [categoryId];
    } else {
      var countParams = [];
    }

    const [countResult] = await db.execute(countQuery, countParams);

    return {
      products,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit),
    };
  }

  // Get featured products
  static async findFeatured(limit = 7) {
    const [rows] = await db.execute(
      `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.is_featured = 1 AND p.is_active = 1
      ORDER BY p.created_at DESC
      LIMIT ?
    `,
      [limit]
    );

    return rows;
  }

  // Get product by ID
  static async findById(id) {
    const [products] = await db.execute(
      `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             c.display_name as category_display
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1
    `,
      [id]
    );

    if (!products[0]) return null;

    // Get product images
    const [images] = await db.execute(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order, is_primary DESC",
      [id]
    );

    return {
      ...products[0],
      images,
    };
  }

  // Get product by slug
  static async findBySlug(slug) {
    const [products] = await db.execute(
      `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             c.display_name as category_display
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
    `,
      [slug]
    );

    if (!products[0]) return null;

    const [images] = await db.execute(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order, is_primary DESC",
      [products[0].id]
    );

    return {
      ...products[0],
      images,
    };
  }

  // Search products
  static async search(query, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const searchQuery = `%${query}%`;

    const [products] = await db.execute(
      `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.is_active = 1 AND 
            (p.name LIKE ? OR p.description LIKE ? OR p.short_description LIKE ?)
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [searchQuery, searchQuery, searchQuery, limit, offset]
    );

    const [countResult] = await db.execute(
      `
      SELECT COUNT(*) as total 
      FROM products 
      WHERE is_active = 1 AND 
            (name LIKE ? OR description LIKE ? OR short_description LIKE ?)
    `,
      [searchQuery, searchQuery, searchQuery]
    );

    return {
      products,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit),
    };
  }
  // Find all products for admin (including inactive)
  static async findAllAdmin(page = 1, limit = 20, categoryId = null) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (categoryId) {
      query += " AND p.category_id = ?";
      params.push(categoryId);
    }

    query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [products] = await db.execute(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM products WHERE 1=1";
    if (categoryId) {
      countQuery += " AND category_id = ?";
      params.pop();
      params.pop(); // Remove limit and offset
      var countParams = [categoryId];
    } else {
      var countParams = [];
    }

    const [countResult] = await db.execute(countQuery, countParams);

    return {
      products,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit),
    };
  }

  // Create product (admin)
  static async create(productData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Generate slug from name if not provided
      let slug = productData.slug;
      if (!slug && productData.name) {
        slug = productData.name
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/--+/g, "-");
      }

      // Insert product
      const [result] = await connection.execute(
        `INSERT INTO products (
          name, slug, description, short_description,
          price, old_price, sale_percent, sku,
          category_id, stock_quantity, is_featured,
          is_active, weight, dimensions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.name,
          slug,
          productData.description || "",
          productData.short_description || "",
          productData.price,
          productData.old_price || null,
          productData.sale_percent || null,
          productData.sku || null,
          productData.category_id,
          productData.stock_quantity || 0,
          productData.is_featured ? 1 : 0,
          productData.is_active !== undefined ? productData.is_active : 1,
          productData.weight || null,
          productData.dimensions || null,
        ]
      );

      const productId = result.insertId;

      // Insert product images if provided
      if (productData.images && Array.isArray(productData.images)) {
        for (const image of productData.images) {
          await connection.execute(
            `INSERT INTO product_images (
              product_id, image_url, alt_text,
              is_primary, display_order
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              productId,
              image.image_url,
              image.alt_text || "",
              image.is_primary ? 1 : 0,
              image.display_order || 0,
            ]
          );
        }
      }

      await connection.commit();

      return this.findById(productId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update product (admin)
  static async update(id, productData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const fields = [];
      const values = [];

      // Build dynamic update query
      Object.keys(productData).forEach((key) => {
        if (key !== "images" && productData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(productData[key]);
        }
      });

      if (fields.length > 0) {
        values.push(id);
        await connection.execute(
          `UPDATE products SET ${fields.join(
            ", "
          )}, updated_at = NOW() WHERE id = ?`,
          values
        );
      }

      // Handle images if provided
      if (productData.images && Array.isArray(productData.images)) {
        // Delete existing images
        await connection.execute(
          "DELETE FROM product_images WHERE product_id = ?",
          [id]
        );

        // Insert new images
        for (const image of productData.images) {
          await connection.execute(
            `INSERT INTO product_images (
              product_id, image_url, alt_text,
              is_primary, display_order
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              id,
              image.image_url,
              image.alt_text || "",
              image.is_primary ? 1 : 0,
              image.display_order || 0,
            ]
          );
        }
      }

      await connection.commit();

      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete product (admin)
  static async delete(id) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Delete product images first
      await connection.execute(
        "DELETE FROM product_images WHERE product_id = ?",
        [id]
      );

      // Delete product
      await connection.execute("DELETE FROM products WHERE id = ?", [id]);

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async search(query, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const searchQuery = `%${query}%`;

    console.log(`Searching for: ${query}, Page: ${page}, Limit: ${limit}`);

    try {
      const [products] = await db.execute(
        `
        SELECT p.*, c.name as category_name, c.slug as category_slug,
               pi.image_url as primary_image
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
        WHERE p.is_active = 1 AND 
              (
                LOWER(p.name) LIKE LOWER(?) OR 
                LOWER(p.description) LIKE LOWER(?) OR 
                LOWER(p.short_description) LIKE LOWER(?)
              )
        ORDER BY 
          CASE 
            WHEN LOWER(p.name) LIKE LOWER(?) THEN 1
            WHEN LOWER(p.short_description) LIKE LOWER(?) THEN 2
            WHEN LOWER(p.description) LIKE LOWER(?) THEN 3
            ELSE 4
          END,
          p.created_at DESC
        LIMIT ? OFFSET ?
        `,
        [
          searchQuery,
          searchQuery,
          searchQuery,
          `%${query}%`,
          `%${query}%`,
          `%${query}%`,
          limit,
          offset,
        ]
      );

      const [countResult] = await db.execute(
        `
        SELECT COUNT(*) as total 
        FROM products 
        WHERE is_active = 1 AND 
              (
                LOWER(name) LIKE LOWER(?) OR 
                LOWER(description) LIKE LOWER(?) OR 
                LOWER(short_description) LIKE LOWER(?)
              )
        `,
        [searchQuery, searchQuery, searchQuery]
      );

      console.log(`Found ${countResult[0].total} products for query: ${query}`);

      return {
        products,
        total: countResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].total / limit),
      };
    } catch (error) {
      console.error("Search error details:", error);
      throw error;
    }
  }
}

module.exports = Product;
