const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const mongoose = require("mongoose");

const EDITABLE_FIELDS = ["name", "description", "price", "category", "image", "stock"];

const validationMessage = (error) => Object.values(error.errors).map(val => val.message).join(", ");

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;
    
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
        return res.status(400).json({ success: false, message: "Price must be greater than 0" });
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
        return res.status(400).json({ success: false, message: "Stock must be a whole number of 0 or more" });
    }
    
    const product = await Product.create({ name, description, price, category, image, stock });
    res.status(201).json({ success: true, product });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: validationMessage(error) });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const filter = {};

    if (search && search.trim() !== "") {
      filter.name = { $regex: escapeRegex(search.trim()), $options: "i" };
    }

    if (category && category.trim() !== "" && category !== "All") {
      filter.category = { $regex: "^" + escapeRegex(category.trim()) + "$", $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") {
      sortOption = { price: 1 };
    } else if (sort === "price_desc") {
      sortOption = { price: -1 };
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .select("name price category image stock createdAt")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({ 
      success: true, 
      count: products.length, 
      total: totalProducts,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      products 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.status(200).json({ success: true, categories: categories.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @desc    Update a product (partial update of any editable field)
 * @route   PATCH /products/:id
 * @access  Admin
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }
    if (updates.price !== undefined && (typeof updates.price !== 'number' || updates.price <= 0)) {
      return res.status(400).json({ success: false, message: "Price must be greater than 0" });
    }
    if (updates.stock !== undefined && (!Number.isInteger(updates.stock) || updates.stock < 0)) {
      return res.status(400).json({ success: false, message: "Stock must be a whole number of 0 or more" });
    }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: validationMessage(error) });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @desc    Delete a product and remove it from every cart and wishlist
 * @route   DELETE /products/:id
 * @access  Admin
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await Customer.updateMany({}, { $pull: { wishlist: product._id, cart: { product: product._id } } });

    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { createProduct, getProducts, getProductById, getCategories, updateProduct, deleteProduct };
