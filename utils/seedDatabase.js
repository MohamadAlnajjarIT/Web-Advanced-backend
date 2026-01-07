const db = require("../config/database");
const bcrypt = require("bcryptjs");

const sampleProducts = [
  // Hot Deals
  {
    name: "Power 30 L Electric Cooler",
    slug: "power-30l-electric-cooler",
    description:
      "It has a 220 volt cable for home and also a 12 volt cable to plug in your car or truck. Insulated body with 20 mm polyurethane foam keeps food and drinks cold longer. This fridge can be used for both cooling and heating by simply changing the switch. Keep cool up to 60 hrs. BPA free. Product Dimensions: 49x32x44 cm",
    short_description: "30L Electric Cooler with heating and cooling functions",
    price: 84.5,
    old_price: 169.0,
    sale_percent: 50,
    category: "hot-deals",
    image: "/assets/img/Products/sale1.webp",
    featured: true,
  },
  {
    name: "Sonifer Multifunction Waffle Non-Stick Coated Electric 750W Waffle Maker",
    slug: "sonifer-waffle-maker",
    description:
      "Small size, serves 2 waffles. Non-stick coated plates for easy cleaning. 750W power for quick heating. Perfect for breakfast or snacks.",
    short_description: "750W Waffle Maker, serves 2 waffles",
    price: 16.9,
    old_price: 33.8,
    sale_percent: 50,
    category: "hot-deals",
    image: "/assets/img/Products/sale2.webp",
    featured: true,
  },
  // Tableware
  {
    name: "Polycarbonate Large Ice Bucket",
    slug: "polycarbonate-ice-bucket",
    description:
      "Size: 22.5 x 21 x 25.5 cm. Break free, Shatter proof. Food Safe material. Perfect for parties and gatherings.",
    short_description: "Large ice bucket, shatter proof",
    price: 7.8,
    category: "tableware",
    image: "/assets/img/Products/t1.webp",
    featured: false,
  },
  {
    name: "Polycarbonate Long Cup Diamond Gray Fume Color",
    slug: "polycarbonate-long-cup",
    description:
      "Size: 8.3 x 14 cm. Capacity: 470 ml. Break free, Shatter proof. Food Safe. Elegant diamond gray fume color.",
    short_description: "470ml long cup, shatter proof",
    price: 3.25,
    category: "tableware",
    image: "/assets/img/Products/t2.webp",
    featured: false,
  },
];

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("admin123", salt);

    await db.execute(
      `
      INSERT INTO users (email, password_hash, full_name, is_admin) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
    `,
      ["admin@mfhome.com", adminPassword, "Admin User", true]
    );

    console.log("✅ Admin user created: admin@mfhome.com / admin123");

    // Seed products
    for (const product of sampleProducts) {
      // Get category ID
      const [categories] = await db.execute(
        "SELECT id FROM categories WHERE slug = ?",
        [product.category]
      );

      if (categories.length > 0) {
        const categoryId = categories[0].id;

        // Insert product
        const [result] = await db.execute(
          `
          INSERT INTO products 
          (category_id, name, slug, description, short_description, price, old_price, sale_percent, is_featured, sku, stock_quantity)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          name = VALUES(name), description = VALUES(description), price = VALUES(price)
        `,
          [
            categoryId,
            product.name,
            product.slug,
            product.description,
            product.short_description,
            product.price,
            product.old_price || null,
            product.sale_percent || null,
            product.featured,
            `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            10,
          ]
        );

        // Insert image
        const productId =
          result.insertId ||
          (
            await db.execute("SELECT id FROM products WHERE slug = ?", [
              product.slug,
            ])
          )[0][0].id;

        await db.execute(
          `
          INSERT INTO product_images (product_id, image_url, alt_text, is_primary)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE image_url = VALUES(image_url)
        `,
          [productId, product.image, product.name, true]
        );

        console.log(`✅ Added product: ${product.name}`);
      }
    }

    console.log("🎉 Database seeding completed!");
    console.log("\n📊 Sample Data:");
    console.log("   - Admin: admin@mfhome.com / admin123");
    console.log("   - Products: 4 sample products added");
    console.log("   - Categories: 5 categories");
  } catch (error) {
    console.error("❌ Seeding error:", error);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
