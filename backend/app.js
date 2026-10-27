const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const customerRoutes = require("./routes/customer.routes");
const productRoutes = require("./routes/product.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

/**
 * Render (and the Netlify /api proxy in front of it) terminate TLS, so trust the
 * proxy headers in production. Needed for `secure` cookies and correct req.ip.
 */
if (isProduction) {
  app.set("trust proxy", parseInt(process.env.TRUST_PROXY, 10) || 1);
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(",").map(s => s.trim()).filter(Boolean) : [])
];

/**
 * Global Middlewares
 * 1. helmet(): Sets secure HTTP headers. CSP is disabled because this service returns JSON, not HTML.
 * 2. express.json(): Parses JSON request bodies into req.body (capped at 100kb).
 * 3. cookieParser(): Parses cookies attached to incoming request headers into req.cookies.
 * 4. cors(): Allows the React frontend origins to send credentialed requests.
 */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

/**
 * Mount Routes
 */
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes);

/**
 * Root / Health Check Routes
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopKart API is up and running!"
  });
});

app.get("/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    database: dbConnected ? "connected" : "disconnected",
    uptime: Math.round(process.uptime())
  });
});

/**
 * Interactive In-Browser API Tester (development only)
 */
if (!isProduction) {
  app.get("/test", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "api-tester.html"));
  });
}

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
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Malformed JSON body" });
  }
  console.error("Unhandled Application Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: "Internal server error occurred",
    error: isProduction ? undefined : err.message
  });
});

module.exports = app;
