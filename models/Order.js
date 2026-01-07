const db = require("../config/database");

class Order {
  // Create new order
  static async create(orderData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      console.log("📝 [Order] Creating order in database...");
      console.log("📝 [Order] Customer:", orderData.customer.full_name);
      console.log("📝 [Order] Items count:", orderData.items.length);

      // Insert order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (
        order_number, 
        customer_name, 
        customer_email, 
        customer_phone, 
        customer_address, 
        customer_city, 
        notes, 
        total_amount, 
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderData.order_number,
          orderData.customer.full_name,
          orderData.customer.email,
          orderData.customer.phone,
          orderData.customer.address,
          orderData.customer.city || "Unknown",
          orderData.customer.notes || "",
          orderData.total_amount,
          "pending",
        ]
      );

      console.log("✅ [Order] Order inserted, ID:", orderResult.insertId);

      const orderId = orderResult.insertId;

      // Insert order items
      for (const item of orderData.items) {
        console.log("📝 [Order] Inserting item:", item.product_name);

        await connection.execute(
          `INSERT INTO order_items (
          order_id, 
          product_id, 
          product_name, 
          quantity, 
          unit_price, 
          total_price
        ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.product_id || 0, // Use 0 if no product_id
            item.product_name || "Unknown Product",
            item.quantity || 1,
            item.unit_price || 0,
            item.total_price || 0,
          ]
        );
      }

      console.log("✅ [Order] All items inserted");

      await connection.commit();

      return {
        id: orderId,
        order_number: orderData.order_number,
        customer_name: orderData.customer.full_name,
        total_amount: orderData.total_amount,
        status: "pending",
      };
    } catch (error) {
      console.error("❌ [Order] Error creating order:", error);
      console.error("❌ [Order] Error details:", {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState,
      });

      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get order by order number
  static async findByOrderNumber(orderNumber) {
    const [orders] = await db.execute(
      `SELECT * FROM orders WHERE order_number = ?`,
      [orderNumber]
    );

    if (!orders[0]) return null;

    const [items] = await db.execute(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orders[0].id]
    );

    return {
      ...orders[0],
      items,
    };
  }

  // Get all orders with items (admin)
  static async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    try {
      // Get orders with item details
      const [orders] = await db.execute(
        `SELECT 
        o.*,
        COUNT(oi.id) as items_count,
        GROUP_CONCAT(oi.product_name SEPARATOR ', ') as product_names
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      // For each order, get detailed items
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const [items] = await db.execute(
            `SELECT product_name, quantity, unit_price, total_price 
           FROM order_items 
           WHERE order_id = ?`,
            [order.id]
          );
          return {
            ...order,
            items: items,
          };
        })
      );

      const [countResult] = await db.execute(
        "SELECT COUNT(*) as total FROM orders"
      );

      return {
        orders: ordersWithItems,
        total: countResult[0]?.total || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
      };
    } catch (error) {
      console.error("Get all orders error:", error);
      throw error;
    }
  }
  // Get order by ID with items (admin)
  static async findById(id) {
    const [orders] = await db.execute(`SELECT * FROM orders WHERE id = ?`, [
      id,
    ]);

    if (!orders[0]) return null;

    const [items] = await db.execute(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [id]
    );

    return {
      ...orders[0],
      items,
    };
  }

  // Update order status
  static async updateStatus(id, status) {
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    await db.execute(
      "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id]
    );

    return this.findById(id);
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      const [totalOrders] = await db.execute(
        "SELECT COUNT(*) as count FROM orders"
      );

      const [totalRevenue] = await db.execute(
        "SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status IN ('delivered', 'completed')"
      );

      const [pendingOrders] = await db.execute(
        "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
      );

      const [todayOrders] = await db.execute(
        "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()"
      );

      // Get recent orders (last 5)
      const [recentOrders] = await db.execute(
        `SELECT order_number, customer_name, total_amount, status, created_at 
       FROM orders 
       ORDER BY created_at DESC 
       LIMIT 5`
      );

      // FIXED: Get top products with proper revenue calculation
      const [topProducts] = await db.execute(
        `SELECT 
          oi.product_name,
          SUM(oi.quantity) as total_quantity,
          COALESCE(SUM(oi.total_price), 0) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY oi.product_name
        ORDER BY total_quantity DESC
        LIMIT 5`
      );

      console.log("📊 Top Products:", topProducts); // Debug log

      return {
        total_orders: totalOrders[0]?.count || 0,
        total_revenue: parseFloat(totalRevenue[0]?.revenue || 0),
        pending_orders: pendingOrders[0]?.count || 0,
        today_orders: todayOrders[0]?.count || 0,
        recent_orders: recentOrders,
        top_products: topProducts.map((p) => ({
          name: p.product_name,
          total_quantity: p.total_quantity,
          total_revenue: parseFloat(p.total_revenue || 0),
        })),
      };
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return {
        total_orders: 0,
        total_revenue: 0,
        pending_orders: 0,
        today_orders: 0,
        recent_orders: [],
        top_products: [],
      };
    }
  }

  // Search orders by order number, customer name, or email
  static async search(query, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const searchQuery = `%${query}%`;

    const [orders] = await db.execute(
      `SELECT 
      o.*,
      COUNT(oi.id) as items_count,
      GROUP_CONCAT(oi.product_name SEPARATOR ', ') as product_names
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.order_number LIKE ? 
       OR LOWER(o.customer_name) LIKE LOWER(?)
       OR LOWER(o.customer_email) LIKE LOWER(?)
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?`,
      [searchQuery, searchQuery, searchQuery, limit, offset]
    );

    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total 
     FROM orders 
     WHERE order_number LIKE ? 
        OR LOWER(customer_name) LIKE LOWER(?)
        OR LOWER(customer_email) LIKE LOWER(?)`,
      [searchQuery, searchQuery, searchQuery]
    );

    // Get detailed items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.execute(
          `SELECT * FROM order_items WHERE order_id = ?`,
          [order.id]
        );
        return {
          ...order,
          items: items,
        };
      })
    );

    return {
      orders: ordersWithItems,
      total: countResult[0]?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
    };
  }

  // Search orders by customer (name, email, phone)
  static async searchByCustomer(query, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const searchQuery = `%${query}%`;

    const [orders] = await db.execute(
      `SELECT 
      o.*,
      COUNT(oi.id) as items_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE LOWER(o.customer_name) LIKE LOWER(?)
       OR LOWER(o.customer_email) LIKE LOWER(?)
       OR o.customer_phone LIKE ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?`,
      [searchQuery, searchQuery, searchQuery, limit, offset]
    );

    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total 
     FROM orders 
     WHERE LOWER(customer_name) LIKE LOWER(?)
        OR LOWER(customer_email) LIKE LOWER(?)
        OR customer_phone LIKE ?`,
      [searchQuery, searchQuery, searchQuery]
    );

    return {
      orders,
      total: countResult[0]?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
    };
  }

  // Get orders by status
  static async getByStatus(status, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [orders] = await db.execute(
      `SELECT 
        o.*,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
      [status, limit, offset]
    );

    const [countResult] = await db.execute(
      "SELECT COUNT(*) as total FROM orders WHERE status = ?",
      [status]
    );

    return {
      orders,
      total: countResult[0]?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
    };
  }

  // Delete order (admin only - use with caution!)
  static async delete(id) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Delete order items first
      await connection.execute("DELETE FROM order_items WHERE order_id = ?", [
        id,
      ]);

      // Delete order
      await connection.execute("DELETE FROM orders WHERE id = ?", [id]);

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Order;
