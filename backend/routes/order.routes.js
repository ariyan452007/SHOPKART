const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const {
  createPaymentOrder,
  verifyPayment,
  getOrders,
  getOrderById
} = require("../controllers/order.controller");

router.use(protect);

router.post("/create-payment-order", createPaymentOrder);
router.post("/verify-payment", verifyPayment);
router.post("/", createPaymentOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);

module.exports = router;
