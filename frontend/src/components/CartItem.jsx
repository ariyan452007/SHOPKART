import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartItem = ({ item }) => {
  const { product, quantity } = item;
  const { updateQuantity, removeFromCart, isPending } = useCart();
  const pending = isPending(product._id);
  const [error, setError] = useState('');

  const handleDecrease = async () => {
    if (quantity <= 1) return;
    setError('');
    const res = await updateQuantity(product._id, quantity - 1);
    if (!res.success) setError(res.message || "Failed to update");
  };

  const handleIncrease = async () => {
    if (quantity >= product.stock) return;
    setError('');
    const res = await updateQuantity(product._id, quantity + 1);
    if (!res.success) setError(res.message || "Failed to update");
  };

  const handleRemove = async () => {
    setError('');
    const res = await removeFromCart(product._id);
    if (!res.success) setError(res.message || "Failed to remove");
  };

  const handleSetMax = async () => {
    setError('');
    const res = await updateQuantity(product._id, product.stock);
    if (!res.success) setError(res.message || "Failed to update");
  };

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
  };

  const stockWarning = product.stock === 0 || quantity > product.stock;

  return (
    <div className={`glass rounded-2xl p-4 flex flex-col sm:flex-row gap-6 items-start sm:items-center border ${stockWarning ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5'}`}>
      <Link to={`/products/${product._id}`} className="shrink-0">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl shadow-lg shadow-black/50"
          onError={handleImageError}
        />
      </Link>
      
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {product.category}
          </span>
        </div>
        
        <Link to={`/products/${product._id}`} className="text-xl font-bold text-white hover:text-indigo-400 transition-colors truncate">
          {product.name}
        </Link>
        
        <div className="text-gray-400 font-medium">
          ₹{Number(product.price).toLocaleString("en-IN")}
        </div>
        
        {stockWarning && (
          <div className="mt-2 text-sm text-amber-400 font-medium flex items-center gap-2 flex-wrap">
            <span>Only {product.stock} left in stock</span>
            {product.stock > 0 && quantity > product.stock && (
              <button 
                onClick={handleSetMax}
                disabled={pending}
                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 transition-colors text-xs disabled:opacity-50"
              >
                Set to {product.stock}
              </button>
            )}
          </div>
        )}
        
        {error && <div className="text-sm text-red-400 mt-1">{error}</div>}
      </div>

      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-white/10">
        <div className="text-xl font-bold text-indigo-300">
          ₹{(product.price * quantity).toLocaleString("en-IN")}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center glass rounded-lg border border-white/10 p-1">
            <button 
              onClick={handleDecrease}
              disabled={pending || quantity <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="w-10 text-center font-semibold text-white">{quantity}</span>
            <button 
              onClick={handleIncrease}
              disabled={pending || quantity >= product.stock}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          
          <button 
            onClick={handleRemove}
            disabled={pending}
            className="text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors disabled:opacity-50"
            aria-label="Remove item"
            title="Remove from cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
