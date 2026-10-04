const bcrypt = require("bcrypt");
const Customer = require("../models/customer.model");
const { generateToken, setTokenCookie, clearTokenCookie } = require("../utils/generateToken");

/**
 * Customer Controller for ShopKart Customer Authentication Service
 * 
 * VIVA CONCEPTS COVERED:
 * 1. bcrypt Hashing:
 *    - bcrypt is a salted, one-way cryptographic hash function based on the Blowfish cipher.
 *    - It cannot be reversed or decrypted back into the original plaintext password.
 *    - Salt: A unique random cryptographic string prepended before hashing to prevent rainbow-table attacks.
 *    - Work Factor (Cost / Salt Rounds = 10): Configures the computational cost, rendering brute-force attacks infeasible.
 * 2. Timing-Safe Comparison:
 *    - bcrypt.compare() prevents timing attacks by taking a consistent duration regardless of matching characters.
 * 3. Generic Error Messages:
 *    - Login failure returns "Invalid email or password" (401) without revealing if the email or password was wrong,
 *      preventing account enumeration attacks.
 * 4. Password Security:
 *    - The password or its hash is NEVER returned in any API response.
 */

/**
 * @desc    Register a new customer account
 * @route   POST /customers/register
 * @access  Public
 */
const registerCustomer = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // 1. Validation: All fields are mandatory
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields (fullName, email, password, phone) are required"
      });
    }

    // 2. Validation: Password minimum length (at least 6 characters)
    if (typeof password !== "string" || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Validation: Unique email check
    const existingCustomer = await Customer.findOne({ email: normalizedEmail });
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    // 4. Hash password with bcrypt before saving to MongoDB
    // Salt rounds: 10 is the industry standard (2^10 hashing iterations)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Store customer in database (ONLY storing bcrypt hash, never plaintext)
    const customer = await Customer.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone.trim()
    });

    // 6. Success Response (HTTP 201 Created) - NEVER return the password
    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (error) {
    // Handle MongoDB unique index violation duplicate key error (E11000)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during registration",
      error: error.message
    });
  }
};

/**
 * @desc    Authenticate customer & issue JWT in HttpOnly cookie
 * @route   POST /customers/login
 * @access  Public
 */
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation: Ensure both email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find customer by email in MongoDB
    const customer = await Customer.findOne({ email: normalizedEmail });
    if (!customer) {
      // Return generic 401: Do NOT reveal whether email or password was wrong
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // 3. Compare plaintext password with stored bcrypt hash
    const isPasswordMatch = await bcrypt.compare(password, customer.password);
    if (!isPasswordMatch) {
      // Return generic 401: Identical message prevents user enumeration
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // 4. Generate JWT containing the customer's MongoDB ObjectId
    const token = generateToken(customer._id);

    // 5. Store the JWT inside a secure HttpOnly cookie
    setTokenCookie(res, token);

    // 6. Return success response (Password must NEVER be returned)
    return res.status(200).json({
      success: true,
      message: "Login successful"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error during login",
      error: error.message
    });
  }
};

/**
 * @desc    Get current authenticated customer profile
 * @route   GET /customers/me
 * @access  Protected (Requires valid JWT in HttpOnly cookie)
 */
const getMyProfile = async (req, res) => {
  try {
    // req.user is attached by auth.middleware.js with password explicitly excluded
    // Return customer profile directly as specified in the lab specifications
    return res.status(200).json({
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile",
      error: error.message
    });
  }
};

/**
 * @desc    Log out customer by clearing the authentication cookie
 * @route   POST /customers/logout
 * @access  Protected
 */
const logoutCustomer = async (req, res) => {
  try {
    // Clear the authentication cookie
    clearTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error during logout",
      error: error.message
    });
  }
};

/**
 * @desc    Change password for authenticated customer (Bonus Challenge)
 * @route   PATCH /customers/change-password
 * @access  Protected
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 1. Validation: Check required fields
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both oldPassword and newPassword are required"
      });
    }

    // 2. Validation: New password length check
    if (typeof newPassword !== "string" || newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long"
      });
    }

    // 3. Validation: New password must be different from old password
    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the old password"
      });
    }

    // 4. Retrieve customer from MongoDB including stored password hash
    // req.user._id was verified and provided by auth.middleware.js
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found"
      });
    }

    // 5. Verify oldPassword against the stored bcrypt hash
    const isOldPasswordValid = await bcrypt.compare(oldPassword, customer.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Incorrect old password"
      });
    }

    // 6. Hash new password with bcrypt before saving
    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(newPassword, salt);
    await customer.save();

    // 7. Return success response
    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while changing password",
      error: error.message
    });
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
  changePassword
};
