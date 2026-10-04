const jwt = require("jsonwebtoken");

/**
 * Utility: generateToken & Cookie Helpers
 * 
 * VIVA CONCEPTS COVERED:
 * 1. JWT (JSON Web Token):
 *    - Structure: Header.Payload.Signature
 *    - Payload: Stores non-sensitive identifier ({ id: customerId }).
 *    - Signature: Generated using HMAC SHA256 with JWT_SECRET to ensure tamper-proofing.
 * 2. Cookie Security Flags:
 *    - httpOnly: true -> Inaccessible to document.cookie in JavaScript; completely mitigates XSS token theft.
 *    - secure: true (in production) -> Cookie is only transmitted across HTTPS connections.
 *    - sameSite: 'strict' -> Mitigates Cross-Site Request Forgery (CSRF) attacks.
 */

/**
 * Generate a signed JWT containing the customer ID
 * @param {string} customerId - The MongoDB ObjectId of the customer
 * @returns {string} - Signed JWT token string
 */
const generateToken = (customerId) => {
  return jwt.sign(
    { id: customerId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
};

/**
 * Retrieve cookie options based on current environment
 * @returns {object} - Express cookie configuration options
 */
const getCookieOptions = () => {
  const cookieDays = parseInt(process.env.COOKIE_EXPIRES_DAYS, 10) || 7;
  return {
    httpOnly: true, // Prevents client-side scripts from accessing the cookie
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: process.env.COOKIE_SAME_SITE || "strict", // Strict CSRF protection
    maxAge: cookieDays * 24 * 60 * 60 * 1000 // Lifespan in milliseconds (e.g. 7 days)
  };
};

/**
 * Attach the JWT inside an HttpOnly cookie on the response object
 * @param {import('express').Response} res - Express response object
 * @param {string} token - Signed JWT token
 */
const setTokenCookie = (res, token) => {
  res.cookie("token", token, getCookieOptions());
};

/**
 * Clear the auth cookie from the client browser on logout
 * @param {import('express').Response} res - Express response object
 */
const clearTokenCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE || "strict"
  });
};

// Support both `const generateToken = require(...)` and `const { generateToken, setTokenCookie } = require(...)`
generateToken.generateToken = generateToken;
generateToken.setTokenCookie = setTokenCookie;
generateToken.clearTokenCookie = clearTokenCookie;
generateToken.getCookieOptions = getCookieOptions;

module.exports = generateToken;
