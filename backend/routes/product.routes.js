const express = require("express");
const router = express.Router();
const { createProduct, getProducts, getProductById } = require("../controllers/product.controller");
const protect = require("../middlewares/auth.middleware");

router.route("/")
  .get(getProducts)
  .post(protect, protect.admin, createProduct);

router.get("/:id", getProductById);

module.exports = router;
