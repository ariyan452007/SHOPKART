const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  fakeRazorpay, connect, disconnect, loginAgent, createProduct, shippingAddress, signPayment, checkout
} = require("./helpers");
const Product = require("../models/product.model");

describe("Checkout & payment", () => {
  before(() => connect("shopkart_test_orders"));
  after(disconnect);
  beforeEach(() => { fakeRazorpay.refunds = []; fakeRazorpay.failRefunds = false; });

  it("refuses to start checkout with an empty cart", async () => {
    const agent = await loginAgent();
    await agent.post("/orders/create-payment-order").send({ shippingAddress }).expect(400);
  });

  it("rejects an invalid pincode", async () => {
    const agent = await loginAgent();
    const product = await createProduct();
    await agent.post(`/cart/${product._id}`).expect(200);
    await agent.post("/orders/create-payment-order")
      .send({ shippingAddress: { ...shippingAddress, pincode: "12" } })
      .expect(400);
  });

  it("computes the amount on the server, ignoring client totals", async () => {
    const agent = await loginAgent();
    const product = await createProduct({ price: 750 });
    await agent.post(`/cart/${product._id}`).expect(200);
    await agent.post(`/cart/${product._id}`).expect(200);
    const res = await agent.post("/orders/create-payment-order")
      .send({ shippingAddress, totalAmount: 1 })
      .expect(201);
    assert.equal(res.body.amount, 750 * 2 * 100);
  });

  it("rejects a forged payment signature", async () => {
    const agent = await loginAgent();
    const product = await createProduct();
    await agent.post(`/cart/${product._id}`).expect(200);
    const start = await agent.post("/orders/create-payment-order").send({ shippingAddress }).expect(201);
    await agent.post("/orders/verify-payment").send({
      shopKartOrderId: start.body.shopKartOrderId,
      razorpay_order_id: start.body.razorpayOrderId,
      razorpay_payment_id: "pay_fake",
      razorpay_signature: "0".repeat(64)
    }).expect(400);
    assert.equal((await Product.findById(product._id)).stock, 10);
  });

  it("places the order, decrements stock and empties the cart on valid payment", async () => {
    const agent = await loginAgent();
    const product = await createProduct({ stock: 5 });
    const { verify } = await checkout(agent, product._id, 2);

    assert.equal(verify.status, 200);
    assert.equal(verify.body.order.status, "PLACED");
    assert.equal(verify.body.order.paymentStatus, "PAID");
    assert.equal((await Product.findById(product._id)).stock, 3);
    assert.equal((await agent.get("/cart")).body.cart.length, 0);
  });

  it("does not decrement stock twice when verify is submitted twice", async () => {
    const agent = await loginAgent();
    const product = await createProduct({ stock: 5 });
    await agent.post(`/cart/${product._id}`).expect(200);
    const start = await agent.post("/orders/create-payment-order").send({ shippingAddress }).expect(201);
    const payload = {
      shopKartOrderId: start.body.shopKartOrderId,
      razorpay_order_id: start.body.razorpayOrderId,
      razorpay_payment_id: "pay_dupe",
      razorpay_signature: signPayment(start.body.razorpayOrderId, "pay_dupe")
    };
    const [a, b] = await Promise.all([
      agent.post("/orders/verify-payment").send(payload),
      agent.post("/orders/verify-payment").send(payload)
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal((await Product.findById(product._id)).stock, 4);
  });

  it("never oversells: the second buyer of the last unit is refunded", async () => {
    const product = await createProduct({ stock: 1 });
    const alice = await loginAgent();
    const bob = await loginAgent();

    // Both open the payment popup while one unit is still available...
    await alice.post(`/cart/${product._id}`).expect(200);
    await bob.post(`/cart/${product._id}`).expect(200);
    const aliceStart = await alice.post("/orders/create-payment-order").send({ shippingAddress }).expect(201);
    const bobStart = await bob.post("/orders/create-payment-order").send({ shippingAddress }).expect(201);

    // ...then both complete payment
    const pay = (agent, start, paymentId) => agent.post("/orders/verify-payment").send({
      shopKartOrderId: start.body.shopKartOrderId,
      razorpay_order_id: start.body.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signPayment(start.body.razorpayOrderId, paymentId)
    });
    const first = { verify: await pay(alice, aliceStart, "pay_alice") };
    const second = { verify: await pay(bob, bobStart, "pay_bob") };

    assert.equal(first.verify.status, 200);
    assert.equal(second.verify.status, 409);
    assert.equal(second.verify.body.order.status, "CANCELLED");
    assert.equal(second.verify.body.order.paymentStatus, "REFUNDED");
    assert.equal(fakeRazorpay.refunds.length, 1);
    assert.equal((await Product.findById(product._id)).stock, 0);
  });

  it("hides abandoned checkouts from the order list", async () => {
    const agent = await loginAgent();
    const product = await createProduct();
    await agent.post(`/cart/${product._id}`).expect(200);
    await agent.post("/orders/create-payment-order").send({ shippingAddress }).expect(201);
    const res = await agent.get("/orders").expect(200);
    assert.equal(res.body.count, 0);
  });
});

describe("Order lifecycle", () => {
  before(() => connect("shopkart_test_lifecycle"));
  after(disconnect);
  beforeEach(() => { fakeRazorpay.refunds = []; fakeRazorpay.failRefunds = false; });

  it("lets a customer cancel a placed order, restoring stock and refunding", async () => {
    const agent = await loginAgent();
    const product = await createProduct({ stock: 4 });
    const { verify, paymentId } = await checkout(agent, product._id, 3);
    const orderId = verify.body.order._id;

    const res = await agent.patch(`/orders/${orderId}/cancel`).send({ reason: "Changed my mind" }).expect(200);
    assert.equal(res.body.order.status, "CANCELLED");
    assert.equal(res.body.order.paymentStatus, "REFUNDED");
    assert.equal(fakeRazorpay.refunds[0].paymentId, paymentId);
    assert.equal((await Product.findById(product._id)).stock, 4);

    // Cancelling twice is rejected and does not restore stock again
    await agent.patch(`/orders/${orderId}/cancel`).expect(400);
    assert.equal((await Product.findById(product._id)).stock, 4);
  });

  it("marks the refund as pending if the gateway refund fails", async () => {
    const agent = await loginAgent();
    const product = await createProduct();
    const { verify } = await checkout(agent, product._id);
    fakeRazorpay.failRefunds = true;
    const res = await agent.patch(`/orders/${verify.body.order._id}/cancel`).expect(200);
    assert.equal(res.body.order.paymentStatus, "REFUND_PENDING");
  });

  it("does not let customers see or cancel other customers' orders", async () => {
    const owner = await loginAgent();
    const stranger = await loginAgent();
    const product = await createProduct();
    const { verify } = await checkout(owner, product._id);
    await stranger.get(`/orders/${verify.body.order._id}`).expect(404);
    await stranger.patch(`/orders/${verify.body.order._id}/cancel`).expect(404);
  });

  it("enforces fulfilment order and blocks cancellation after shipping", async () => {
    const admin = await loginAgent({ admin: true });
    const customer = await loginAgent();
    const product = await createProduct();
    const { verify } = await checkout(customer, product._id);
    const id = verify.body.order._id;

    await admin.patch(`/admin/orders/${id}/status`).send({ status: "SHIPPED" }).expect(400);
    await admin.patch(`/admin/orders/${id}/status`).send({ status: "CONFIRMED" }).expect(200);
    const shipped = await admin.patch(`/admin/orders/${id}/status`).send({ status: "SHIPPED" }).expect(200);
    assert.deepEqual(shipped.body.order.statusHistory.map(h => h.status), ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "SHIPPED"]);

    await customer.patch(`/orders/${id}/cancel`).expect(400);
    await admin.patch(`/admin/orders/${id}/status`).send({ status: "DELIVERED" }).expect(200);
  });

  it("reports revenue and low stock on the admin dashboard", async () => {
    const admin = await loginAgent({ admin: true });
    const res = await admin.get("/admin/stats").expect(200);
    assert.ok(res.body.stats.revenue > 0);
    assert.ok(res.body.stats.paidOrders >= 1);
    assert.ok(Array.isArray(res.body.stats.lowStock));

    const orders = await admin.get("/admin/orders").expect(200);
    assert.ok(orders.body.orders[0].user.email);
  });
});
