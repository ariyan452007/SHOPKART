const crypto = require("crypto");
const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const razorpayConfig = require("../config/razorpay");
const { reserveStock, refundPayment, cancelOrder } = require("../utils/orderService");

const createPaymentOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: "Shipping address is required" });
    }

    const fields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    for (const field of fields) {
      if (!shippingAddress[field] || typeof shippingAddress[field] !== 'string' || shippingAddress[field].trim() === '') {
        return res.status(400).json({ success: false, message: `${field} is required and cannot be empty.` });
      }
      shippingAddress[field] = shippingAddress[field].trim();
    }

    const phoneStr = shippingAddress.phone.replace(/[\s-]/g, '');
    if (!/^\+?\d{10,13}$/.test(phoneStr)) {
      return res.status(400).json({ success: false, message: "Invalid phone number." });
    }

    if (!/^\d{6}$/.test(shippingAddress.pincode)) {
      return res.status(400).json({ success: false, message: "Pincode must contain 6 digits." });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer || !customer.cart || customer.cart.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const productIds = customer.cart.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== customer.cart.length) {
      return res.status(400).json({ success: false, message: "A product in your cart is no longer available. Please review your cart." });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const cartItem of customer.cart) {
      const product = products.find(p => p._id.toString() === cartItem.product.toString());
      if (product.stock < cartItem.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}.` });
      }
      totalAmount += product.price * cartItem.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        image: product.image
      });
    }

    let razorpay;
    try {
      razorpay = razorpayConfig.getRazorpay();
    } catch (err) {
      return res.status(500).json({ success: false, message: "Payment gateway is not configured" });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      totalAmount,
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT",
      statusHistory: [{ status: "PENDING_PAYMENT", note: "Checkout started" }]
    });

    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: order._id.toString()
      });

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return res.status(201).json({
        success: true,
        shopKartOrderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID
      });
    } catch (err) {
      order.paymentStatus = "FAILED";
      await order.save();
      return res.status(502).json({ success: false, message: "Unable to start payment. Please try again." });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!shopKartOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature ||
        typeof shopKartOrderId !== 'string' || typeof razorpay_order_id !== 'string' ||
        typeof razorpay_payment_id !== 'string' || typeof razorpay_signature !== 'string' ||
        shopKartOrderId.trim() === '' || razorpay_order_id.trim() === '' ||
        razorpay_payment_id.trim() === '' || razorpay_signature.trim() === '') {
      return res.status(400).json({ success: false, message: "Missing or invalid payment verification details" });
    }

    if (!mongoose.isValidObjectId(shopKartOrderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await Order.findOne({ _id: shopKartOrderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (razorpay_order_id !== order.razorpayOrderId) {
      return res.status(400).json({ success: false, message: "Order mismatch" });
    }

    if (order.paymentStatus !== "PENDING") {
      return res.status(200).json({ success: true, message: "Payment already processed", order });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Payment gateway is not configured" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(order.razorpayOrderId + "|" + razorpay_payment_id)
      .digest("hex");

    const expectedBuffer = Buffer.from(generatedSignature, 'utf-8');
    const actualBuffer = Buffer.from(razorpay_signature, 'utf-8');

    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Atomically claim the order so a double-submitted verify cannot reserve stock twice
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "PENDING" },
      { $set: { paymentStatus: "PAID", razorpayPaymentId: razorpay_payment_id } },
      { new: true }
    );
    if (!claimed) {
      const current = await Order.findById(order._id);
      return res.status(200).json({ success: true, message: "Payment already processed", order: current });
    }

    // Reserve stock now that money has been captured
    const reservation = await reserveStock(claimed.items);
    if (!reservation.ok) {
      const refundId = await refundPayment(claimed);
      claimed.status = "CANCELLED";
      claimed.paymentStatus = refundId ? "REFUNDED" : "REFUND_PENDING";
      claimed.razorpayRefundId = refundId || undefined;
      claimed.cancelReason = `${reservation.failedItem.name} went out of stock during payment`;
      claimed.statusHistory.push({ status: "CANCELLED", note: "Out of stock — payment refunded" });
      await claimed.save();
      return res.status(409).json({
        success: false,
        message: `Sorry, ${reservation.failedItem.name} sold out while you were paying. Your payment ${refundId ? "has been refunded" : "will be refunded"}.`,
        order: claimed
      });
    }

    claimed.status = "PLACED";
    claimed.statusHistory.push({ status: "PLACED", note: "Payment verified" });
    await claimed.save();

    await Customer.updateOne({ _id: req.user._id }, { $set: { cart: [] } });

    return res.status(200).json({ success: true, message: "Payment verified", order: claimed });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getOrders = async (req, res) => {
  try {
    // Hide abandoned checkouts (payment never completed) unless explicitly requested
    const filter = { user: req.user._id };
    if (req.query.all !== 'true') {
      filter.status = { $ne: "PENDING_PAYMENT" };
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const cancelMyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const existing = await Order.findOne({ _id: id, user: req.user._id });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 200) : "";
    const order = await cancelOrder({ _id: id, user: req.user._id }, { reason: reason || "Cancelled by customer", by: "customer" });
    if (!order) {
      return res.status(400).json({ success: false, message: `Order cannot be cancelled once it is ${existing.status.toLowerCase().replace("_", " ")}` });
    }

    return res.status(200).json({
      success: true,
      message: order.paymentStatus === "REFUNDED" ? "Order cancelled and payment refunded" : "Order cancelled. Your refund is being processed.",
      order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getOrders,
  getOrderById,
  cancelMyOrder
};
