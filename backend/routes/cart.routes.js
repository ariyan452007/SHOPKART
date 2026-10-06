const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  checkout
} = require("../controllers/cart.controller");

router.use(protect);

router.get("/", getCart);
router.post("/checkout", checkout);
router.post("/:productId", addToCart);
router.patch("/:productId", updateQuantity);
router.delete("/:productId", removeFromCart);

module.exports = router;
