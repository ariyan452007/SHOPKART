const express = require("express");
const router = express.Router();
const {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
  changePassword
} = require("../controllers/customer.controller");
const protect = require("../middlewares/auth.middleware");

/**
 * Customer Authentication & Profile Routes
 * Base URL mounted at: /customers
 * 
 * Public Endpoints:
 * - POST  /customers/register         -> Register new customer
 * - POST  /customers/login            -> Authenticate customer & set HttpOnly cookie
 * 
 * Protected Endpoints (Require valid JWT in HttpOnly cookie):
 * - GET   /customers/me               -> Fetch current customer profile
 * - POST  /customers/logout           -> Clear auth cookie
 * - PATCH /customers/change-password  -> Verify old password & update to new hash (Bonus)
 */

// Public Routes
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);

// Protected Routes
router.get("/me", protect, getMyProfile);
router.post("/logout", protect, logoutCustomer);
router.patch("/change-password", protect, changePassword);

module.exports = router;
