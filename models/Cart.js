const db = require("../config/database");

class Cart {
  // Get or create cart for guest session
  static async getOrCreateCart(sessionId) {
    const [carts] = await db.execute(
      "SELECT * FROM carts WHERE session_id = ?",
      [sessionId]
    );

    if (carts.length > 0) {
      return carts[0];
    }

    // Create new cart for guest
    const [result] = await db.execute(
      "INSERT INTO carts (session_id) VALUES (?)",
      [sessionId]
    );

    const [newCart] = await db.execute("SELECT * FROM carts WHERE id = ?", [
      result.insertId,
    ]);
    return newCart[0];
  }

  // Get guest cart by session ID
  static async getCartBySessionId(sessionId) {
    const cart = await this.getOrCreateCart(sessionId);

    const [rows] = await db.execute(
      `
      SELECT 
        ci.id as cart_item_id,
        ci.quantity,
        p.id as product_id,
        p.name,
        p.slug,
        p.price,
        p.sale_percent,
        p.old_price,
        p.short_description,
        pi.image_url as primary_image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE ci.cart_id = ?
      ORDER BY ci.added_at DESC
      `,
      [cart.id]
    );

    return {
      cart_id: cart.id,
      session_id: cart.session_id,
      items: rows,
    };
  }

  // Add item to cart
  static async addToCart(cartId, productId, quantity = 1) {
    // Check if item already exists in cart
    const [existing] = await db.execute(
      "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cartId, productId]
    );

    if (existing.length > 0) {
      // Update quantity
      const newQuantity = existing[0].quantity + quantity;
      await db.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", [
        newQuantity,
        existing[0].id,
      ]);

      const [updated] = await db.execute(
        "SELECT * FROM cart_items WHERE id = ?",
        [existing[0].id]
      );
      return updated[0];
    } else {
      // Insert new item
      const [result] = await db.execute(
        "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
        [cartId, productId, quantity]
      );

      const [newItem] = await db.execute(
        "SELECT * FROM cart_items WHERE id = ?",
        [result.insertId]
      );
      return newItem[0];
    }
  }

  // Update cart item quantity
  static async updateCartItem(itemId, quantity) {
    if (quantity < 1) {
      // Remove item if quantity is 0
      await db.execute("DELETE FROM cart_items WHERE id = ?", [itemId]);
      return { deleted: true };
    }

    await db.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", [
      quantity,
      itemId,
    ]);

    const [updated] = await db.execute(
      "SELECT * FROM cart_items WHERE id = ?",
      [itemId]
    );
    return updated[0];
  }

  // Remove item from cart
  static async removeFromCart(itemId) {
    await db.execute("DELETE FROM cart_items WHERE id = ?", [itemId]);
    return true;
  }

  // Clear cart
  static async clearCart(cartId) {
    await db.execute("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
    return true;
  }
}

module.exports = Cart;
