/**
 * Create an admin account, or promote an existing customer to admin.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pass' npm run create-admin
 *
 * Credentials come from environment variables so they never land in shell
 * history files or in the repository.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const Customer = require("../models/customer.model");

dotenv.config();

const run = async () => {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  const fullName = process.env.ADMIN_NAME || "ShopKart Admin";

  if (!email) {
    throw new Error("Set ADMIN_EMAIL (and ADMIN_PASSWORD for a new account)");
  }

  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart");

  const existing = await Customer.findOne({ email });
  if (existing) {
    existing.isAdmin = true;
    if (password) existing.password = await bcrypt.hash(password, 10);
    await existing.save();
    console.log(`Promoted ${email} to admin${password ? " and reset password" : ""}.`);
  } else {
    if (password.length < 8) {
      throw new Error("ADMIN_PASSWORD must be at least 8 characters for a new admin");
    }
    await Customer.create({
      fullName,
      email,
      password: await bcrypt.hash(password, 10),
      phone: process.env.ADMIN_PHONE || "9000000000",
      isAdmin: true
    });
    console.log(`Created admin account ${email}.`);
  }
};

run()
  .catch((err) => {
    console.error("create-admin failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
