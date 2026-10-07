const crypto = require("crypto");
const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const { getRazorpay } = require("../config/razorpay");

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

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      totalAmount,
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT"
    });

    let razorpay;
    try {
      razorpay = getRazorpay();
    } catch (err) {
      return res.status(500).json({ success: false, message: "Payment gateway is not configured" });
    }

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
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
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

    if (order.paymentStatus === "PAID") {
      return res.status(200).json({ success: true, message: "Payment already verified", order });
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

    order.paymentStatus = "PAID";
    order.status = "PLACED";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    await Customer.updateOne({ _id: req.user._id }, { $set: { cart: [] } });

    return res.status(200).json({ success: true, message: "Payment verified", order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.all !== 'true') {
      filter.paymentStatus = "PAID";
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
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
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getOrders,
  getOrderById
};
