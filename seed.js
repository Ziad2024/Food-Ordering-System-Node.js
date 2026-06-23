import dotenv from "dotenv";
dotenv.config({ path: ".env.production" });
import mongoose from "mongoose";
import Category from "./src/modules/product/models/category.model.js";
import Product from "./src/modules/product/models/product.model.js";

const seedData = async () => {
  try {
    // Connect using the production URL so it seeds the live Atlas DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to Live MongoDB Atlas");

    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log("🧹 Cleared existing products and categories");

    // 1. Create Categories
    const categories = await Category.insertMany([
      { name: { en: "Burgers", ar: "برجر" }, slug: "burgers", description: { en: "Juicy burgers", ar: "برجر لذيذ" } },
      { name: { en: "Pizza", ar: "بيتزا" }, slug: "pizza", description: { en: "Wood-fired pizza", ar: "بيتزا على الحطب" } },
      { name: { en: "Drinks", ar: "مشروبات" }, slug: "drinks", description: { en: "Cold beverages", ar: "مشروبات باردة" } }
    ]);
    console.log(`✅ Created ${categories.length} categories`);

    // 2. Create Products
    const products = await Product.insertMany([
      {
        name: { en: "Classic Cheeseburger", ar: "تشيز برجر كلاسيك" },
        description: { en: "Beef patty with cheese, lettuce, and tomato", ar: "شريحة لحم مع الجبن والخس والطماطم" },
        price: 8.99,
        category: categories[0]._id, // Burgers
        images: ["https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80"],
        isActive: true,
        stock: 50
      },
      {
        name: { en: "Double Smash Burger", ar: "دبل سماش برجر" },
        description: { en: "Two smashed patties with special sauce", ar: "شريحتين لحم مع صوص خاص" },
        price: 12.99,
        category: categories[0]._id, // Burgers
        images: ["https://images.unsplash.com/photo-1594212202875-86ac4ce4050e?w=500&q=80"],
        isActive: true,
        stock: 30
      },
      {
        name: { en: "Margherita Pizza", ar: "بيتزا مارغريتا" },
        description: { en: "Fresh mozzarella, tomatoes, and basil", ar: "موزاريلا طازجة، طماطم، وريحان" },
        price: 14.99,
        category: categories[1]._id, // Pizza
        images: ["https://images.unsplash.com/photo-1604068549290-dea0e4a30536?w=500&q=80"],
        isActive: true,
        stock: 20
      },
      {
        name: { en: "Pepperoni Pizza", ar: "بيتزا بيبيروني" },
        description: { en: "Classic pepperoni with extra cheese", ar: "بيبيروني كلاسيك مع جبن زيادة" },
        price: 16.99,
        category: categories[1]._id, // Pizza
        images: ["https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80"],
        isActive: true,
        stock: 25
      },
      {
        name: { en: "Coca Cola", ar: "كوكا كولا" },
        description: { en: "Ice cold can", ar: "علبة باردة جداً" },
        price: 1.99,
        category: categories[2]._id, // Drinks
        images: ["https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80"],
        isActive: true,
        stock: 100
      }
    ]);
    console.log(`✅ Created ${products.length} products`);

    console.log("🎉 Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
