import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleWishlist } from '../services/api';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product, isWishlisted = false, onWishlistChange }) => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(isWishlisted);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
  const [cartError, setCartError] = useState('');
  
  const { addToCart, isPending, getQuantity } = useCart();
  const quantityInCart = getQuantity(product._id);
  const pending = isPending(product._id);
  const isOutOfStock = product.stock === 0;
  const isMaxInCart = quantityInCart >= product.stock;

  const isRequesting = useRef(false);

  useEffect(() => {
    setSaved(isWishlisted);
  }, [isWishlisted]);

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/600x400?text=No+Image';
  };

  const handleAddToCart = async () => {
    setCartError('');
    const res = await addToCart(product._id);
    if (!res.success) {
      if (res.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setCartError(res.message || "Failed to add to cart");
      setTimeout(() => setCartError(''), 3000);
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return <span className="text-red-400 font-medium text-sm">Out of stock</span>;
    if (stock < 5) return <span className="text-amber-400 font-medium text-sm">Only {stock} left</span>;
    return <span className="text-green-400 font-medium text-sm">{stock} units left</span>;
  };

  const handleWishlistClick = async () => {
    if (isRequesting.current) return;
    
    isRequesting.current = true;
    setIsSaving(true);
    setError(false);
    
    try {
      const res = await toggleWishlist(product._id);
      
      const newlySaved = res.data.saved !== undefined ? res.data.saved : !saved;
      setSaved(newlySaved);
      
      window.dispatchEvent(new Event("wishlist:changed"));
      if (onWishlistChange) {
        onWishlistChange(product._id, newlySaved);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      
      if (err.response?.status === 409) {
        setSaved(true);
        window.dispatchEvent(new Event("wishlist:changed"));
        if (onWishlistChange) onWishlistChange(product._id, true);
      } else {
        setError(true);
      }
    } finally {
      setIsSaving(false);
      isRequesting.current = false;
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col shadow-xl shadow-black/50 border border-white/5 transition-transform hover:scale-[1.02] hover:shadow-indigo-500/10">
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-gray-800">
        <img 
          src={product.image} 
          alt={product.name} 
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-cover object-center" 
        />
        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md rounded-full p-1.5 flex items-center justify-center">
          {saved ? (
            <span className="text-pink-500 text-sm leading-none" title="In Wishlist">♥</span>
          ) : (
            <span className="text-white/70 text-sm leading-none" title="Not in Wishlist">♡</span>
          )}
        </div>
        <div className="absolute top-2 right-2 bg-indigo-500/90 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-md">
          {product.category}
        </div>
        {quantityInCart > 0 && (
          <div className="absolute bottom-2 left-2 bg-indigo-500/90 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg shadow-black/50">
            In cart: {quantityInCart}
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-semibold text-white mb-1 truncate" title={product.name}>
          {product.name}
        </h3>
        <div className="flex items-center justify-between pt-4">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-indigo-300">
              ₹{Number(product.price).toLocaleString("en-IN")}
            </span>
            {getStockStatus(product.stock)}
          </div>
          <button
            onClick={() => navigate(`/products/${product._id}`)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 border border-white/10"
          >
            View Details
          </button>
        </div>
        <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
          <button
            onClick={handleAddToCart}
            disabled={pending || isOutOfStock || isMaxInCart}
            className={`w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 border
              ${pending || isOutOfStock || isMaxInCart
                ? 'bg-gray-800 text-gray-400 border-gray-700 cursor-not-allowed'
                : 'bg-indigo-500 text-white border-indigo-400 hover:bg-indigo-400 hover:border-indigo-300'
              }`}
          >
            {pending ? "Adding..." : isOutOfStock ? "Out of Stock" : isMaxInCart ? "Max in cart" : quantityInCart > 0 ? "Add Another" : "Add to Cart"}
          </button>
          {cartError && (
            <p className="text-center text-xs text-red-400">{cartError}</p>
          )}
          <button
            onClick={handleWishlistClick}
            disabled={isSaving}
            className={`w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-pink-500 border
              ${isSaving 
                ? 'bg-gray-800 text-gray-400 border-gray-700 cursor-not-allowed' 
                : saved 
                  ? 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30' 
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
          >
            {isSaving ? "⏳ Saving..." : saved ? "♥ Remove from Wishlist" : "♡ Add to Wishlist"}
          </button>
          {error && (
            <p className="text-center text-xs text-red-400">Unable to save product. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
