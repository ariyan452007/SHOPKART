const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  getCategories,
  updateProduct,
  deleteProduct
} = require("../controllers/product.controller");
const protect = require("../middlewares/auth.middleware");

// Public catalogue
router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProductById);

// Admin-only catalogue management
router.post("/", protect, protect.admin, createProduct);
router.patch("/:id", protect, protect.admin, updateProduct);
router.delete("/:id", protect, protect.admin, deleteProduct);

module.exports = router;
