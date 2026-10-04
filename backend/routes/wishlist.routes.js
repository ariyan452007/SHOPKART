const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount
} = require("../controllers/wishlist.controller");

// Apply auth middleware to all routes in this router
router.use(protect);

router.get("/count", getWishlistCount);
router.get("/", getWishlist);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);
router.patch("/:productId/toggle", toggleWishlist);

module.exports = router;
