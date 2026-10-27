const Product = require("../models/product.model");
const Order = require("../models/order.model");
const razorpayConfig = require("../config/razorpay");

/**
 * Decrement stock for every item in an order.
 * Each update is conditional on enough stock remaining (`stock >= qty`), so two
 * customers paying for the last unit at the same time can never push stock below 0.
 * If any item cannot be reserved, the items already decremented are rolled back.
 *
 * @returns {Promise<{ ok: boolean, failedItem?: object }>}
 */
const reserveStock = async (items) => {
  const reserved = [];
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (result.modifiedCount === 0) {
      await restoreStock(reserved);
      return { ok: false, failedItem: item };
    }
    reserved.push(item);
  }
  return { ok: true };
};

/**
 * Put stock back for the given order items (cancellation / rollback).
 * Products deleted since the order was placed are simply skipped.
 */
const restoreStock = async (items) => {
  if (items.length === 0) return;
  await Product.bulkWrite(items.map(item => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity } }
    }
  })));
};

/**
 * Ask Razorpay to refund a captured payment in full.
 * @returns {Promise<string|null>} refund id, or null if the refund could not be issued
 */
const refundPayment = async (order) => {
  if (!order.razorpayPaymentId) return null;
  try {
    const refund = await razorpayConfig.getRazorpay().payments.refund(order.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100),
      notes: { shopKartOrderId: order._id.toString() }
    });
    return refund.id;
  } catch (err) {
    console.error(`Refund failed for order ${order._id}:`, err.error?.description || err.message);
    return null;
  }
};

/**
 * Cancel an order: atomically flip status to CANCELLED (only if it is still in a
 * cancellable state), restore stock, and refund the payment.
 *
 * @returns {Promise<Order|null>} the cancelled order, or null if it was no longer cancellable
 */
const cancelOrder = async (filter, { reason, by }) => {
  const cancellableFrom = Object.keys(Order.TRANSITIONS).filter(s => Order.TRANSITIONS[s].includes("CANCELLED"));

  const order = await Order.findOneAndUpdate(
    { ...filter, status: { $in: cancellableFrom } },
    {
      $set: { status: "CANCELLED", cancelReason: reason },
      $push: { statusHistory: { status: "CANCELLED", note: `Cancelled by ${by}` } }
    },
    { new: true }
  );
  if (!order) return null;

  await restoreStock(order.items);

  const refundId = await refundPayment(order);
  order.paymentStatus = refundId ? "REFUNDED" : "REFUND_PENDING";
  order.razorpayRefundId = refundId || undefined;
  await order.save();

  return order;
};

module.exports = { reserveStock, restoreStock, refundPayment, cancelOrder };
