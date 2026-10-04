import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getWishlist } from '../services/api';
import WishlistCard from '../components/WishlistCard';
import axios from 'axios';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const navigate = useNavigate();

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchWishlist = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getWishlist(abortController.signal);
        if (res.data.success) {
          setWishlist(res.data.wishlist || []);
        }
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        
        if (err.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWishlist();
    
    return () => abortController.abort();
  }, [navigate, retryCount]);

  const handleRemove = (productId) => {
    setWishlist(prev => prev.filter(p => p._id !== productId));
    window.dispatchEvent(new Event("wishlist:changed"));
  };

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-900 to-gray-900"></div>
      
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">My Wishlist</h1>
        {!loading && !error && wishlist.length > 0 && (
          <p className="text-sm text-gray-400 mt-2">{wishlist.length} product(s) saved</p>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-indigo-300 font-medium">Loading your wishlist...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl border-red-500/20">
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 font-medium mb-2">Something went wrong.</p>
          <p className="text-gray-400 mb-4">Unable to load wishlist.</p>
          <button 
            onClick={() => setRetryCount(c => c + 1)}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all border border-white/10"
          >
            Try Again
          </button>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">❤️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Your wishlist is empty</h2>
          <p className="text-gray-400 mb-6">Save products you love and find them here later.</p>
          <Link 
            to="/products"
            className="group relative flex justify-center rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-all active:scale-[0.98]"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map(p => <WishlistCard key={p._id} product={p} onRemove={handleRemove} />)}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
