const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables from .env before anything reads process.env
dotenv.config();

const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

/**
 * Connect to MongoDB and start the Express server
 */
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    app.listen(PORT, () => {
      console.log(`ShopKart Backend Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
