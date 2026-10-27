const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, request, connect, disconnect, loginAgent, createProduct } = require("./helpers");

describe("Customer authentication", () => {
  before(() => connect("shopkart_test_auth"));
  after(disconnect);

  const user = { fullName: "Asha Rao", email: "asha@example.com", password: "secret123", phone: "9876543210" };

  it("registers a customer without returning the password", async () => {
    const res = await request(app).post("/customers/register").send(user).expect(201);
    assert.equal(res.body.customer.email, user.email);
    assert.equal(res.body.customer.password, undefined);
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/customers/register").send(user).expect(409);
  });

  it("accepts long top-level domains like .store", async () => {
    await request(app).post("/customers/register").send({ ...user, email: "shop@brand.store" }).expect(201);
  });

  it("rejects a short password with 400", async () => {
    await request(app).post("/customers/register").send({ ...user, email: "x@example.com", password: "123" }).expect(400);
  });

  it("returns a generic 401 for a wrong password", async () => {
    const res = await request(app).post("/customers/login").send({ email: user.email, password: "wrong-pass" }).expect(401);
    assert.equal(res.body.message, "Invalid email or password");
  });

  it("sets an HttpOnly cookie on login and serves /me", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/customers/login").send({ email: user.email, password: user.password }).expect(200);
    assert.match(login.headers["set-cookie"][0], /token=.+HttpOnly/);

    const me = await agent.get("/customers/me").expect(200);
    assert.equal(me.body.email, user.email);
    assert.equal(me.body.isAdmin, false);
  });

  it("blocks protected routes without a cookie", async () => {
    await request(app).get("/customers/me").expect(401);
    await request(app).get("/cart").expect(401);
    await request(app).get("/orders").expect(401);
  });

  it("locks an email out after repeated failed logins", async () => {
    const email = "bruteforce@example.com";
    for (let i = 0; i < 3; i++) {
      await request(app).post("/customers/login").send({ email, password: "nope" }).expect(401);
    }
    await request(app).post("/customers/login").send({ email, password: "nope" }).expect(429);
  });
});

describe("Product catalogue & admin guard", () => {
  before(() => connect("shopkart_test_products"));
  after(disconnect);

  it("caps page size at 50", async () => {
    await Promise.all(Array.from({ length: 55 }, (_, i) => createProduct({ name: `Item ${i}` })));
    const res = await request(app).get("/products?limit=1000").expect(200);
    assert.equal(res.body.count, 50);
    assert.equal(res.body.total, 55);
    assert.equal(res.body.totalPages, 2);
  });

  it("lists distinct categories", async () => {
    await createProduct({ name: "Novel", category: "Books" });
    const res = await request(app).get("/products/categories").expect(200);
    assert.deepEqual(res.body.categories, ["Books", "Home"]);
  });

  it("forbids non-admins from managing products", async () => {
    const customer = await loginAgent();
    await customer.post("/products").send({ name: "Hack" }).expect(403);
    await customer.get("/admin/stats").expect(403);
  });

  it("lets an admin create, edit and delete a product", async () => {
    const admin = await loginAgent({ admin: true });
    const created = await admin.post("/products").send({
      name: "Desk Lamp", description: "Warm light", category: "Home",
      image: "https://example.com/lamp.jpg", price: 1299, stock: 7
    }).expect(201);
    const id = created.body.product._id;

    const edited = await admin.patch(`/products/${id}`).send({ price: 999, stock: 3 }).expect(200);
    assert.equal(edited.body.product.price, 999);
    await admin.patch(`/products/${id}`).send({ price: -5 }).expect(400);

    // Deleting also removes it from carts
    const shopper = await loginAgent();
    await shopper.post(`/cart/${id}`).expect(200);
    await admin.delete(`/products/${id}`).expect(200);
    const cart = await shopper.get("/cart").expect(200);
    assert.equal(cart.body.cart.length, 0);
  });
});
