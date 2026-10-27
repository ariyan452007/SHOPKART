const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const { cancelOrder } = require("../utils/orderService");

const LOW_STOCK_THRESHOLD = 5;

/**
 * @desc    Store-wide numbers for the admin dashboard
 * @route   GET /admin/stats
 * @access  Admin
 */
const getStats = async (req, res) => {
  try {
    const [revenue, byStatus, customers, products, lowStock] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: "PAID" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "PENDING_PAYMENT" } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Customer.countDocuments({ isAdmin: { $ne: true } }),
      Product.countDocuments(),
      Product.find({ stock: { $lt: LOW_STOCK_THRESHOLD } })
        .select("name stock image")
        .sort({ stock: 1 })
        .lean()
    ]);

    const ordersByStatus = Object.fromEntries(byStatus.map(s => [s._id, s.count]));

    return res.status(200).json({
      success: true,
      stats: {
        revenue: revenue[0]?.total || 0,
        paidOrders: revenue[0]?.orders || 0,
        ordersByStatus,
        customers,
        products,
        lowStock
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    All customer orders, newest first, optionally filtered by status
 * @route   GET /admin/orders?status=PLACED&page=1&limit=20
 * @access  Admin
 */
const getAllOrders = async (req, res) => {
  try {
    const filter = { status: { $ne: "PENDING_PAYMENT" } };
    if (req.query.status && Order.TRANSITIONS[req.query.status] && req.query.status !== "PENDING_PAYMENT") {
      filter.status = req.query.status;
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .populate("user", "fullName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      orders
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    Move an order to its next fulfilment status (or cancel it)
 * @route   PATCH /admin/orders/:id/status   { status: "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" }
 * @access  Admin
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }
    if (typeof status !== "string" || !Order.TRANSITIONS[status]) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const allowed = Order.TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change an order from ${order.status} to ${status}`
      });
    }

    if (status === "CANCELLED") {
      const cancelled = await cancelOrder({ _id: id }, { reason: "Cancelled by store", by: "admin" });
      if (!cancelled) {
        return res.status(409).json({ success: false, message: "Order status changed, please refresh" });
      }
      return res.status(200).json({ success: true, order: cancelled });
    }

    // Conditional on the current status so two admins cannot apply conflicting updates
    const updated = await Order.findOneAndUpdate(
      { _id: id, status: order.status },
      { $set: { status }, $push: { statusHistory: { status, note: "Updated by admin" } } },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ success: false, message: "Order status changed, please refresh" });
    }

    return res.status(200).json({ success: true, order: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getStats, getAllOrders, updateOrderStatus };
