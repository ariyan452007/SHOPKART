const Razorpay = require("razorpay");

let razorpayInstance = null;

const getRazorpay = () => {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Payment gateway is not configured");
  }

  razorpayInstance = new Razorpay({
    key_id,
    key_secret,
  });

  return razorpayInstance;
};

module.exports = { getRazorpay };
