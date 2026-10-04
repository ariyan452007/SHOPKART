const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

const getPopulatedCart = async (customerId) => {
  const customer = await Customer.findById(customerId).populate({
    path: "cart.product",
    select: "name price image category stock"
  });

  if (!customer) return [];

  // Filter out items where product is null (deleted products)
  const cart = customer.cart || [];
  return cart.filter(item => item.product !== null);
};

const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.stock < 1) {
      return res.status(400).json({ success: false, message: "Product is out of stock" });
    }

    const customer = await Customer.findById(req.user._id);
    const existingCartItem = customer.cart.find(item => item.product.toString() === productId);
    const currentQty = existingCartItem ? existingCartItem.quantity : 0;
    const newQty = currentQty + 1;

    if (newQty > product.stock) {
      return res.status(400).json({ success: false, message: `Only ${product.stock} units available` });
    }

    if (existingCartItem) {
      await Customer.updateOne(
        { _id: req.user._id, "cart.product": productId },
        { $set: { "cart.$.quantity": newQty } }
      );
    } else {
      await Customer.updateOne(
        { _id: req.user._id, "cart.product": { $ne: productId } },
        { $push: { cart: { product: productId, quantity: 1 } } }
      );
    }

    const populatedCart = await getPopulatedCart(req.user._id);
    return res.status(200).json({ success: true, message: "Cart updated", cart: populatedCart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    const cart = await getPopulatedCart(req.user._id);
    return res.status(200).json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
      return res.status(400).json({ success: false, message: "Quantity must be a number" });
    }

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const customer = await Customer.findById(req.user._id);
    const existingCartItem = customer.cart.find(item => item.product.toString() === productId);

    if (!existingCartItem) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ success: false, message: `Only ${product.stock} units available` });
    }

    await Customer.updateOne(
      { _id: req.user._id, "cart.product": productId },
      { $set: { "cart.$.quantity": quantity } }
    );

    const populatedCart = await getPopulatedCart(req.user._id);
    return res.status(200).json({ success: true, message: "Quantity updated", cart: populatedCart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const customer = await Customer.findById(req.user._id);
    const existingCartItem = customer.cart.find(item => item.product.toString() === productId);

    if (!existingCartItem) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    await Customer.updateOne(
      { _id: req.user._id },
      { $pull: { cart: { product: productId } } }
    );

    const populatedCart = await getPopulatedCart(req.user._id);
    return res.status(200).json({ success: true, message: "Product removed from cart", cart: populatedCart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart
};
