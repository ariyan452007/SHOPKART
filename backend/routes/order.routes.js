const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const {
  createPaymentOrder,
  verifyPayment,
  getOrders,
  getOrderById,
  cancelMyOrder
} = require("../controllers/order.controller");

router.use(protect);

router.post("/create-payment-order", createPaymentOrder);
router.post("/verify-payment", verifyPayment);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch("/:id/cancel", cancelMyOrder);

module.exports = router;
