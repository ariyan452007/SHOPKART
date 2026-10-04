const mongoose = require("mongoose");

/**
 * Customer Schema for ShopKart Customer Authentication Service
 * 
 * Fields:
 * - fullName: String, required, trimmed
 * - email: String, required, unique, lowercase, trimmed
 * - password: String, required (stores ONLY bcrypt hash, never plaintext)
 * - phone: String, required, trimmed
 * - createdAt: Date, default Date.now
 */
const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address"
      ]
    },
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    wishlist: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: []
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false // Schema uses explicit createdAt field as defined in the lab requirements
  }
);

/**
 * Defense-in-Depth Security:
 * Ensure the password hash is automatically stripped whenever a Customer document
 * is converted to JSON (e.g. res.json(customer)) or to a plain JavaScript Object.
 * Passwords should NEVER appear in API responses.
 */
customerSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

customerSchema.set("toObject", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
