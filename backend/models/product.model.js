const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: { type: String, required: [true, "Name is required"], trim: true },
  description: { type: String, required: [true, "Description is required"], trim: true },
  category: { type: String, required: [true, "Category is required"], trim: true },
  image: { type: String, required: [true, "Image is required"], trim: true },
  price: { 
    type: Number, 
    required: [true, "Price is required"],
    validate: {
      validator: function(v) { return v > 0; },
      message: "Price must be greater than 0"
    }
  },
  stock: { type: Number, required: [true, "Stock is required"], min: [0, "Stock cannot be negative"] }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.models.Product || mongoose.model("Product", schema);
