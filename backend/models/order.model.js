const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
    index: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true }
  },
  totalAmount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "REFUND_PENDING"],
    default: "PENDING"
  },
  status: {
    type: String,
    enum: ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
    default: "PENDING_PAYMENT",
    index: true
  },
  statusHistory: [{
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String }
  }],
  cancelReason: { type: String, trim: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpayRefundId: { type: String }
}, {
  timestamps: true
});

/**
 * Order lifecycle: which status an order may move to next.
 * CANCELLED is terminal and only reachable before the order ships.
 */
orderSchema.statics.TRANSITIONS = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  PENDING_PAYMENT: []
};

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
