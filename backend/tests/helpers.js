/**
 * Shared test setup: an isolated MongoDB database per test file, a fake
 * Razorpay client (no network calls), and helpers for logged-in agents.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.RAZORPAY_KEY_ID = "rzp_test_fake";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
process.env.LOGIN_MAX_ATTEMPTS = "3";

const crypto = require("crypto");
const mongoose = require("mongoose");
const request = require("supertest");
const razorpayConfig = require("../config/razorpay");
const app = require("../app");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

const fakeRazorpay = {
  refunds: [],
  failRefunds: false,
  orders: {
    create: async ({ amount }) => ({ id: `order_${crypto.randomBytes(6).toString("hex")}`, amount })
  },
  payments: {
    refund: async (paymentId, opts) => {
      if (fakeRazorpay.failRefunds) throw new Error("refund failed");
      fakeRazorpay.refunds.push({ paymentId, ...opts });
      return { id: `rfnd_${crypto.randomBytes(6).toString("hex")}` };
    }
  }
};
razorpayConfig.getRazorpay = () => fakeRazorpay;

const connect = async (dbName) => {
  const base = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017";
  await mongoose.connect(`${base.replace(/\/$/, "")}/${dbName}`);
  await mongoose.connection.dropDatabase();
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

let userCounter = 0;

/** Register + log in a fresh customer; returns a cookie-carrying supertest agent. */
const loginAgent = async ({ admin = false } = {}) => {
  userCounter += 1;
  const email = `user${userCounter}_${Date.now()}@example.com`;
  const password = "secret123";
  const agent = request.agent(app);
  await agent.post("/customers/register")
    .send({ fullName: `User ${userCounter}`, email, password, phone: "9876543210" })
    .expect(201);
  if (admin) await Customer.updateOne({ email }, { $set: { isAdmin: true } });
  await agent.post("/customers/login").send({ email, password }).expect(200);
  return agent;
};

const createProduct = (overrides = {}) => Product.create({
  name: "Test Mug",
  description: "A mug for tests",
  category: "Home",
  image: "https://example.com/mug.jpg",
  price: 500,
  stock: 10,
  ...overrides
});

const shippingAddress = {
  fullName: "Test User",
  phone: "9876543210",
  addressLine1: "221B Baker Street",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001"
};

/** Signature exactly as Razorpay Checkout would produce it for a successful payment. */
const signPayment = (razorpayOrderId, paymentId) => crypto
  .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpayOrderId}|${paymentId}`)
  .digest("hex");

/** Add productId to the agent's cart, start checkout and complete a valid payment. */
const checkout = async (agent, productId, quantity = 1) => {
  for (let i = 0; i < quantity; i++) {
    await agent.post(`/cart/${productId}`).expect(200);
  }
  const start = await agent.post("/orders/create-payment-order").send({ shippingAddress }).expect(201);
  const paymentId = `pay_${crypto.randomBytes(6).toString("hex")}`;
  const verify = await agent.post("/orders/verify-payment").send({
    shopKartOrderId: start.body.shopKartOrderId,
    razorpay_order_id: start.body.razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signPayment(start.body.razorpayOrderId, paymentId)
  });
  return { start, verify, paymentId };
};

module.exports = {
  app,
  request,
  fakeRazorpay,
  connect,
  disconnect,
  loginAgent,
  createProduct,
  shippingAddress,
  signPayment,
  checkout
};
