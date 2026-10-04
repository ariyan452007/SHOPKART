const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");

/**
 * Authentication Middleware
 * 
 * VIVA CONCEPTS COVERED:
 * 1. Role of Middleware:
 *    - Sits between the incoming request and the final controller handler.
 *    - Centralizes authentication logic so every protected route does not duplicate code.
 * 2. Token Extraction:
 *    - Reads the JWT from the incoming request cookies (parsed by cookie-parser).
 *    - Also supports reading from Bearer Authorization header as an alternative for API tools.
 * 3. Token Verification:
 *    - Decodes and validates the signature using the server's private JWT_SECRET.
 *    - Rejects expired or tampered tokens with HTTP 401 Unauthorized.
 * 4. User Attachment:
 *    - Queries the database for the active customer ID embedded in the token payload.
 *    - Uses .select("-password") to ensure password hash is NEVER loaded into memory.
 *    - Attaches the customer object to `req.user` for access in subsequent controllers.
 */
const protect = async (req, res, next) => {
  try {
    // Step 1: Read token from HttpOnly cookie
    let token = req.cookies?.token || req.cookies?.jwt;

    // Fallback: Check Authorization header (Bearer <token>)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token is found, customer is unauthenticated -> 401 Unauthorized
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Access denied, no authentication token provided"
      });
    }

    // Step 2: Verify token signature and expiration using JWT_SECRET
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or expired token"
      });
    }

    // Step 3: Fetch customer from MongoDB (explicitly excluding password field)
    const customer = await Customer.findById(decoded.id).select("-password");
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Customer account no longer exists"
      });
    }

    // Step 4: Attach customer object to req.user for downstream controllers
    req.user = customer;

    // Proceed to next middleware or route handler
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
      error: error.message
    });
  }
};

// Allow both `const protect = require(...)` and `const { protect } = require(...)`
protect.protect = protect;
protect.authMiddleware = protect;

module.exports = protect;
