const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/product.model");

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart";

const seedProducts = [
  { name: "Pro Wireless Earbuds", description: "High-quality noise cancelling earbuds.", category: "Electronics", image: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=600&h=400&q=80", price: 4999, stock: 15 },
  { name: "4K Action Camera", description: "Waterproof action camera with 4K recording.", category: "Electronics", image: "https://images.unsplash.com/photo-1484506399805-c273b8e91dce?auto=format&fit=crop&w=600&h=400&q=80", price: 12999, stock: 8 },
  { name: "Mechanical Keyboard", description: "RGB mechanical keyboard with tactile switches.", category: "Electronics", image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&h=400&q=80", price: 6500, stock: 2 },
  
  { name: "Men's Casual Shirt", description: "Comfortable cotton blend shirt.", category: "Fashion", image: "https://images.unsplash.com/photo-1740711152088-88a009e877bb?auto=format&fit=crop&w=600&h=400&q=80", price: 1200, stock: 25 },
  { name: "Classic Denim Jacket", description: "Stylish blue denim jacket.", category: "Fashion", image: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=600&h=400&q=80", price: 2999, stock: 0 },
  { name: "Running Sneakers", description: "Lightweight breathable sneakers for running.", category: "Fashion", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&h=400&q=80", price: 3500, stock: 10 },
  
  { name: "The Pragmatic Programmer", description: "A classic book on software engineering.", category: "Books", image: "https://images.unsplash.com/photo-1628258334105-2a0b3d6efee1?auto=format&fit=crop&w=600&h=400&q=80", price: 850, stock: 50 },
  { name: "Atomic Habits", description: "Build good habits and break bad ones.", category: "Books", image: "https://images.unsplash.com/photo-1705721357357-ab87523248f7?auto=format&fit=crop&w=600&h=400&q=80", price: 450, stock: 30 },
  { name: "Dune", description: "Epic science fiction novel.", category: "Books", image: "https://images.unsplash.com/photo-1600109961702-c701c004da5b?auto=format&fit=crop&w=600&h=400&q=80", price: 600, stock: 12 },
  
  { name: "Ceramic Coffee Mug", description: "Minimalist ceramic mug for your daily coffee.", category: "Home", image: "https://images.unsplash.com/photo-1666445844615-0a3930270f13?auto=format&fit=crop&w=600&h=400&q=80", price: 350, stock: 40 },
  { name: "Orthopedic Memory Pillow", description: "Supportive memory foam pillow.", category: "Home", image: "https://images.unsplash.com/photo-1564019472231-4586c552dc27?auto=format&fit=crop&w=600&h=400&q=80", price: 1500, stock: 20 },
  { name: "Indoor Potted Plant", description: "Low maintenance indoor plant with pot.", category: "Home", image: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=600&h=400&q=80", price: 800, stock: 4 }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for seeding...");
    
    await Product.deleteMany({});
    console.log("Cleared existing products.");
    
    const inserted = await Product.insertMany(seedProducts);
    console.log(`Successfully seeded ${inserted.length} products.`);
    
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
