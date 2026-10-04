const express = require("express");
const router = express.Router();
const { createProduct, getProducts, getProductById } = require("../controllers/product.controller");

router.route("/")
  .get(getProducts)
  .post(createProduct);

router.get("/:id", getProductById);

module.exports = router;
