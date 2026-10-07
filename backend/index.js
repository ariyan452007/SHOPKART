const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables from .env
dotenv.config();

// Import customer routes
const customerRoutes = require("./routes/customer.routes");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart";

/**
 * Global Middlewares
 * 1. express.json(): Parses incoming HTTP request bodies containing JSON data into req.body.
 * 2. cookieParser(): Parses cookies attached to incoming request headers into req.cookies.
 */
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173", ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(",").map(s => s.trim()).filter(Boolean) : [])],
  credentials: true
}));

const productRoutes = require("./routes/product.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const cartRoutes = require("./routes/cart.routes");

/**
 * Mount Routes
 * Mounts all customer authentication and profile endpoints under the '/customers' path prefix.
 */
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);

const orderRoutes = require("./routes/order.routes");
app.use("/orders", orderRoutes);

/**
 * Root / Health Check Route
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopKart Customer Authentication Service is up and running!",
    interactiveTester: `http://localhost:${PORT}/test`
  });
});

/**
 * Interactive In-Browser API Tester
 * Allows testing POST, GET, and PATCH requests with HttpOnly cookies directly in Chrome/Safari
 */
app.get("/test", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShopKart API Tester</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; }
    header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #334155; }
    h1 { font-size: 24px; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    p.subtitle { color: #94a3b8; font-size: 14px; margin-top: 4px; }
    .notice { background: #1e293b; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; color: #cbd5e1; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .card h2 { font-size: 16px; margin-bottom: 12px; color: #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .method-badge { font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .post { background: #166534; color: #86efac; }
    .get { background: #1e40af; color: #93c5fd; }
    .patch { background: #854d0e; color: #fde047; }
    .form-group { margin-bottom: 10px; }
    label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
    input { width: 100%; padding: 8px 10px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #fff; font-size: 13px; }
    input:focus { outline: none; border-color: #38bdf8; }
    button { width: 100%; padding: 9px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s; margin-top: 4px; }
    button:hover { background: #1d4ed8; }
    button.alt { background: #475569; }
    button.alt:hover { background: #334155; }
    button.danger { background: #b91c1c; }
    button.danger:hover { background: #991b1b; }
    .response-box { grid-column: 1 / -1; background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .response-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .status-badge { font-size: 13px; font-weight: bold; padding: 3px 10px; border-radius: 4px; }
    .status-2xx { background: #14532d; color: #4ade80; }
    .status-4xx { background: #7c2d12; color: #f87171; }
    pre { background: #090d16; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 12px; color: #e2e8f0; max-height: 250px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🛒 ShopKart Customer Auth Service</h1>
      <p class="subtitle">Interactive REST API Tester with automatic HttpOnly Cookie Session Management</p>
    </header>

    <div class="notice">
      ℹ️ <strong>Why did typing URLs directly into the browser fail?</strong><br>
      The browser address bar only performs <code>HTTP GET</code> requests. Endpoints like <code>/customers/register</code> and <code>/customers/login</code> require <code>HTTP POST</code> with a JSON body. Protected routes like <code>/customers/me</code> require logging in first to receive the HttpOnly cookie. Use the interactive controls below to test everything directly!
    </div>

    <div class="grid">
      <!-- 1. Register -->
      <div class="card">
        <h2><span>Task 1: Register Customer</span> <span class="method-badge post">POST</span></h2>
        <div class="form-group"><label>Full Name</label><input id="regName" value="John Doe" /></div>
        <div class="form-group"><label>Email</label><input id="regEmail" value="john@example.com" /></div>
        <div class="form-group"><label>Password (min 6 chars)</label><input id="regPass" type="password" value="secret123" /></div>
        <div class="form-group"><label>Phone</label><input id="regPhone" value="9876543210" /></div>
        <button onclick="register()">Send Register Request</button>
      </div>

      <!-- 2. Login -->
      <div class="card">
        <h2><span>Task 2: Login Customer</span> <span class="method-badge post">POST</span></h2>
        <div class="form-group"><label>Email</label><input id="loginEmail" value="john@example.com" /></div>
        <div class="form-group"><label>Password</label><input id="loginPass" type="password" value="secret123" /></div>
        <button onclick="login()">Send Login Request</button>
      </div>

      <!-- 3. Profile & 4. Logout -->
      <div class="card">
        <h2><span>Task 3 & 4: Profile & Logout</span> <span class="method-badge get">GET</span></h2>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Protected endpoints that automatically send your HttpOnly cookie.</p>
        <button class="alt" onclick="getProfile()" style="margin-bottom: 8px;">GET /customers/me (My Profile)</button>
        <button class="danger" onclick="logout()">POST /customers/logout (Clear Cookie)</button>
      </div>

      <!-- 5. Change Password -->
      <div class="card">
        <h2><span>Task 5: Change Password</span> <span class="method-badge patch">PATCH</span></h2>
        <div class="form-group"><label>Old Password</label><input id="oldPass" type="password" value="secret123" /></div>
        <div class="form-group"><label>New Password (min 6 chars)</label><input id="newPass" type="password" value="newsecret456" /></div>
        <button onclick="changePassword()">Send Change Password</button>
      </div>

      <!-- Response Viewer -->
      <div class="response-box">
        <div class="response-header">
          <strong id="resTitle" style="color: #38bdf8;">API Response</strong>
          <span id="resBadge" class="status-badge status-2xx" style="display:none;">200 OK</span>
        </div>
        <pre id="resData">// Click any action button above to see the live API response here...</pre>
      </div>
    </div>
  </div>

  <script>
    async function execute(method, url, data) {
      const title = document.getElementById("resTitle");
      const badge = document.getElementById("resBadge");
      const out = document.getElementById("resData");
      title.innerText = method + " " + url;
      badge.style.display = "none";
      out.innerText = "Sending request...";

      try {
        const opts = {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include" // Automatically manages HttpOnly cookie!
        };
        if (data) opts.body = JSON.stringify(data);

        const res = await fetch(url, opts);
        const json = await res.json();

        badge.style.display = "inline-block";
        badge.innerText = res.status + " " + res.statusText;
        badge.className = "status-badge " + (res.ok ? "status-2xx" : "status-4xx");
        out.innerText = JSON.stringify(json, null, 2);
      } catch (err) {
        badge.style.display = "inline-block";
        badge.innerText = "Error";
        badge.className = "status-badge status-4xx";
        out.innerText = err.message;
      }
    }

    function register() {
      execute("POST", "/customers/register", {
        fullName: document.getElementById("regName").value,
        email: document.getElementById("regEmail").value,
        password: document.getElementById("regPass").value,
        phone: document.getElementById("regPhone").value
      });
    }

    function login() {
      execute("POST", "/customers/login", {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPass").value
      });
    }

    function getProfile() {
      execute("GET", "/customers/me");
    }

    function logout() {
      execute("POST", "/customers/logout");
    }

    function changePassword() {
      execute("PATCH", "/customers/change-password", {
        oldPassword: document.getElementById("oldPass").value,
        newPassword: document.getElementById("newPass").value
      });
    }
  </script>
</body>
</html>`);
});

/**
 * 404 Handler for undefined routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

/**
 * Global Error Handling Middleware
 */
app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

/**
 * Connect to MongoDB and start the Express server
 */
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    app.listen(PORT, () => {
      console.log(`ShopKart Backend Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/`);
      console.log(`API Base URL: http://localhost:${PORT}/customers`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

module.exports = app;
