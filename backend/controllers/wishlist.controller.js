const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model"); // require product model for populate

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const result = await Customer.updateOne(
      { _id: req.user._id, wishlist: { $ne: productId } },
      { $addToSet: { wishlist: productId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).json({ success: false, message: "Product already in wishlist" });
    }

    return res.status(201).json({ success: true, message: "Product added to wishlist" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).populate({
      path: "wishlist",
      select: "name price category image stock"
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Filter out null entries (deleted products) and handle missing wishlist field
    const wishlist = (customer.wishlist || []).filter(item => item !== null);

    return res.status(200).json({ 
      success: true, 
      count: wishlist.length, 
      wishlist 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const result = await Customer.updateOne(
      { _id: req.user._id, wishlist: productId },
      { $pull: { wishlist: productId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Product not in wishlist" });
    }

    return res.status(200).json({ success: true, message: "Product removed from wishlist" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if it's already in the wishlist
    const customer = await Customer.findOne({ _id: req.user._id, wishlist: productId });
    
    if (customer) {
      // Remove it
      await Customer.updateOne(
        { _id: req.user._id },
        { $pull: { wishlist: productId } }
      );
      return res.status(200).json({ success: true, saved: false, message: "Product removed from wishlist" });
    } else {
      // Add it
      await Customer.updateOne(
        { _id: req.user._id },
        { $addToSet: { wishlist: productId } }
      );
      return res.status(200).json({ success: true, saved: true, message: "Product added to wishlist" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getWishlistCount = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select("wishlist");
    const count = customer && customer.wishlist ? customer.wishlist.length : 0;
    
    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount
};
