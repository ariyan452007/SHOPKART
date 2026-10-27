const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const { getStats, getAllOrders, updateOrderStatus } = require("../controllers/admin.controller");

// Every admin route requires a logged-in customer with isAdmin = true
router.use(protect, protect.admin);

router.get("/stats", getStats);
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);

module.exports = router;
