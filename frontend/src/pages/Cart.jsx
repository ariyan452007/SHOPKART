import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, loading, error, refreshCart, itemCount, subtotal } = useCart();
  const [checkoutNotice, setCheckoutNotice] = useState(false);

  useEffect(() => {
    const init = async () => {
      const res = await refreshCart();
      if (res.status === 401) {
        navigate('/login', { replace: true });
      }
    };
    init();
  }, [refreshCart, navigate]);

  const hasInvalidItems = cartItems.some(item => item.product.stock === 0 || item.quantity > item.product.stock);

  if (loading && cartItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-300 font-medium">Loading your cart...</p>
      </div>
    );
  }

  if (error && cartItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl border-red-500/20">
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button 
            onClick={() => refreshCart()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all border border-white/10"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Looks like you haven't added anything yet.</p>
          <Link 
            to="/products"
            className="group relative flex justify-center rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-all active:scale-[0.98]"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-900 to-gray-900"></div>
      
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">My Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:flex-1 flex flex-col gap-4">
          {cartItems.map(item => (
            <CartItem key={item.product._id} item={item} />
          ))}
        </div>
        
        <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-24">
          <div className="glass rounded-2xl p-6 border border-white/5 shadow-xl shadow-black/50">
            <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400">Items</span>
              <span className="text-white font-medium">{itemCount}</span>
            </div>
            
            <div className="flex items-center justify-between mb-6 pt-4 border-t border-white/10">
              <span className="text-gray-300 font-bold">Subtotal</span>
              <span className="text-2xl font-bold text-indigo-400">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            </div>
            
            <button
              onClick={() => setCheckoutNotice(true)}
              disabled={hasInvalidItems}
              className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                ${hasInvalidItems
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400 active:scale-[0.98]'
                }`}
            >
              Proceed to Checkout
            </button>
            
            {hasInvalidItems && (
              <p className="mt-3 text-center text-sm text-amber-400 font-medium">
                Update quantities to match available stock
              </p>
            )}
            
            {checkoutNotice && !hasInvalidItems && (
              <p className="mt-3 text-center text-sm text-indigo-300 animate-pulse bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                Checkout will be available in the next lab.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
