import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logoutCustomer, getWishlistCount } from '../services/api';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [wishlistCount, setWishlistCount] = useState(null);
  const { itemCount, clearCart } = useCart();

  const fetchWishlistCount = async (signal) => {
    try {
      const res = await getWishlistCount(signal);
      if (res.data.success) {
        setWishlistCount(res.data.count);
      }
    } catch (err) {
      // Ignore count errors silently
    }
  };

  useEffect(() => {
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    if (isAuthPage) return;

    const abortController = new AbortController();
    fetchWishlistCount(abortController.signal);

    const handleWishlistChange = () => fetchWishlistCount(abortController.signal);
    window.addEventListener("wishlist:changed", handleWishlistChange);

    return () => {
      window.removeEventListener("wishlist:changed", handleWishlistChange);
      abortController.abort();
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      clearCart();
      navigate('/login', { replace: true });
    }
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isProductsPage = location.pathname.startsWith('/products');
  const isWishlistPage = location.pathname === '/wishlist';
  const isCartPage = location.pathname === '/cart';

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to={isAuthPage ? "/login" : "/home"} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20">
                S
              </div>
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                ShopKart
              </span>
            </Link>
          </div>
          <div>
            {!isAuthPage && (
              <div className="flex items-center gap-4">
                <Link
                  to="/home"
                  className={`text-sm font-medium transition-colors ${location.pathname === '/home' ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  Home
                </Link>
                <Link
                  to="/products"
                  className={`text-sm font-medium transition-colors ${isProductsPage ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  Products
                </Link>
                <Link
                  to="/wishlist"
                  className={`text-sm font-medium transition-colors ${isWishlistPage ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  Wishlist {wishlistCount !== null ? `(${wishlistCount})` : ''}
                </Link>
                <Link
                  to="/cart"
                  className={`text-sm font-medium transition-colors ${isCartPage || location.pathname === '/checkout' ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  Cart {itemCount > 0 ? `(${itemCount})` : ''}
                </Link>
                <Link
                  to="/orders"
                  className={`text-sm font-medium transition-colors ${location.pathname.startsWith('/orders') || location.pathname.startsWith('/order-success') ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  Orders
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ml-2"
                >
                  Logout
                </button>
              </div>
            )}
            {isAuthPage && location.pathname === '/login' && (
              <Link
                to="/register"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Create Account
              </Link>
            )}
            {isAuthPage && location.pathname === '/register' && (
              <Link
                to="/login"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
