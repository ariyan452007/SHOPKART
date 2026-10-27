const rateLimit = require("express-rate-limit");

/**
 * Login brute-force protection.
 * Counts only FAILED attempts, keyed by the email being tried, so one attacker
 * cannot lock out every user behind the same proxy IP and a correct login is
 * never blocked by earlier typos once it succeeds.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `login:${String(req.body?.email || "").toLowerCase().trim()}`,
  message: {
    success: false,
    message: "Too many failed login attempts. Please try again in 15 minutes."
  }
});

module.exports = { loginLimiter };
