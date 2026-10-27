import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logoutCustomer, getWishlistCount } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [wishlistCount, setWishlistCount] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, clearCart } = useCart();
  const { user, clearUser } = useAuth();

  const path = location.pathname;
  const isAuthPage = path === '/login' || path === '/register';

  useEffect(() => {
    if (isAuthPage) return;

    const abortController = new AbortController();
    const fetchWishlistCount = async () => {
      try {
        const res = await getWishlistCount(abortController.signal);
        if (res.data.success) setWishlistCount(res.data.count);
      } catch {
        // Count is decorative; ignore failures
      }
    };
    fetchWishlistCount();

    window.addEventListener("wishlist:changed", fetchWishlistCount);
    return () => {
      window.removeEventListener("wishlist:changed", fetchWishlistCount);
      abortController.abort();
    };
  }, [path, isAuthPage]);

  // Close the mobile menu whenever the route changes
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setMenuOpen(false);
  }

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      clearCart();
      clearUser();
      navigate('/login', { replace: true });
    }
  };

  const links = [
    { to: '/home', label: 'Home', active: path === '/home' },
    { to: '/products', label: 'Products', active: path.startsWith('/products') },
    { to: '/wishlist', label: `Wishlist${wishlistCount ? ` (${wishlistCount})` : ''}`, active: path === '/wishlist' },
    { to: '/cart', label: `Cart${itemCount > 0 ? ` (${itemCount})` : ''}`, active: path === '/cart' || path === '/checkout' },
    { to: '/orders', label: 'Orders', active: path.startsWith('/orders') || path.startsWith('/order-success') },
    ...(user?.isAdmin ? [{ to: '/admin', label: 'Admin', active: path.startsWith('/admin'), admin: true }] : [])
  ];

  const linkClass = (link) => {
    if (link.admin) {
      return `text-sm font-semibold transition-colors ${link.active ? 'text-amber-300' : 'text-amber-400/80 hover:text-amber-300'}`;
    }
    return `text-sm font-medium transition-colors ${link.active ? 'text-white' : 'text-gray-300 hover:text-white'}`;
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={isAuthPage ? "/login" : "/home"} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              ShopKart
            </span>
          </Link>

          {!isAuthPage && (
            <>
              <div className="hidden md:flex items-center gap-5">
                {links.map(link => (
                  <Link key={link.to} to={link.to} className={linkClass(link)}>{link.label}</Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ml-1"
                >
                  Logout
                </button>
              </div>

              <div className="flex md:hidden items-center gap-3">
                <Link to="/cart" className="text-sm font-medium text-gray-200">
                  🛒{itemCount > 0 ? ` ${itemCount}` : ''}
                </Link>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {menuOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              </div>
            </>
          )}

          {path === '/login' && (
            <Link to="/register" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Create Account
            </Link>
          )}
          {path === '/register' && (
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {!isAuthPage && menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-gray-900/95 px-4 py-3 flex flex-col gap-1">
          {links.map(link => (
            <Link key={link.to} to={link.to} className={`${linkClass(link)} block px-3 py-2 rounded-md ${link.active ? 'bg-white/10' : ''}`}>
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="mt-2 text-left px-3 py-2 rounded-md text-sm font-medium text-red-300 hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
