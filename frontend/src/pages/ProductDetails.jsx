import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMe, getProductById, getErrorMessage, getWishlist, toggleWishlist } from '../services/api';
import { useCart } from '../context/CartContext';
import axios from 'axios';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cartError, setCartError] = useState("");
  
  const { addToCart, isPending, getQuantity } = useCart();
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const isRequesting = useRef(false);

  // Auth check
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await getMe();
        setAuthLoading(false);
      } catch (err) {
        navigate('/login', { replace: true });
        return;
      }
      
      try {
        const res = await getWishlist();
        if (res.data.success && res.data.wishlist) {
          const ids = new Set(res.data.wishlist.map(w => w._id));
          setIsSaved(ids.has(id));
        }
      } catch (err) {
        // silent fail
      }
    };
    verifyAuth();
  }, [navigate, id]);

  useEffect(() => {
    if (authLoading) return;
    
    const abortController = new AbortController();
    
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getProductById(id, abortController.signal);
        setProduct(res.data.product);
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        
        if (err.response?.status === 400 || err.response?.status === 404) {
          setError(getErrorMessage(err));
        } else {
          setError("Something went wrong while loading the product.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
    
    return () => abortController.abort();
  }, [id, authLoading]);

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

  const handleWishlistClick = async () => {
    if (isRequesting.current) return;
    
    isRequesting.current = true;
    setIsSaving(true);
    setSaveError(false);
    
    try {
      const res = await toggleWishlist(product._id);
      
      const newlySaved = res.data.saved !== undefined ? res.data.saved : !isSaved;
      setIsSaved(newlySaved);
      
      window.dispatchEvent(new Event("wishlist:changed"));
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      
      if (err.response?.status === 409) {
        setIsSaved(true);
        window.dispatchEvent(new Event("wishlist:changed"));
      } else {
        setSaveError(true);
      }
    } finally {
      setIsSaving(false);
      isRequesting.current = false;
    }
  };

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/1200x800?text=No+Image';
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-300 font-medium">Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center glass rounded-2xl border-red-500/20 shadow-xl shadow-black/50 p-8 text-center max-w-2xl mx-auto mt-12 w-full">
          <svg className="w-20 h-20 text-red-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-red-400 text-lg mb-8">{error}</p>
          <Link 
            to="/products"
            className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2"
          >
            <span>&larr;</span> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const isOutOfStock = product.stock === 0;
  const quantityInCart = getQuantity(product._id);
  const pending = isPending(product._id);
  const isMaxInCart = quantityInCart >= product.stock;

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-gray-900 to-gray-900"></div>
      
      <div className="mb-6">
        <Link to="/products" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-indigo-400 transition-colors">
          <span>&larr;</span> <span className="ml-2">Back to Products</span>
        </Link>
      </div>

      <div className="glass rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 flex flex-col lg:flex-row">
        <div className="lg:w-1/2 bg-gray-800 relative">
          <img 
            src={product.image} 
            alt={product.name} 
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover min-h-[300px] lg:min-h-full aspect-[4/3] lg:aspect-auto" 
          />
          {quantityInCart > 0 && (
            <div className="absolute bottom-4 left-4 bg-indigo-500/90 backdrop-blur text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-black/50">
              In cart: {quantityInCart}
            </div>
          )}
        </div>
        
        <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col">
          <div className="inline-block bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full mb-4 self-start">
            {product.category}
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            {product.name}
          </h1>
          
          <div className="text-3xl font-bold text-indigo-400 mb-6">
            ₹{Number(product.price).toLocaleString("en-IN")}
          </div>
          
          <div className="prose prose-invert mb-8">
            <p className="text-gray-300 text-lg leading-relaxed">
              {product.description}
            </p>
          </div>
          
          <div className="mt-auto pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-400 font-medium">Availability</span>
              {isOutOfStock ? (
                <span className="text-red-400 font-bold px-3 py-1 bg-red-400/10 rounded-lg border border-red-400/20">Out of stock</span>
              ) : product.stock < 5 ? (
                <span className="text-amber-400 font-bold px-3 py-1 bg-amber-400/10 rounded-lg border border-amber-400/20">Only {product.stock} left</span>
              ) : (
                <span className="text-green-400 font-bold px-3 py-1 bg-green-400/10 rounded-lg border border-green-400/20">In Stock ({product.stock})</span>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAddToCart}
                disabled={pending || isOutOfStock || isMaxInCart}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 border
                  ${pending || isOutOfStock || isMaxInCart
                    ? 'bg-gray-800 text-gray-400 border-gray-700 cursor-not-allowed'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400 border-indigo-400 hover:border-indigo-300'
                  }`}
              >
                {pending ? "Adding..." : isOutOfStock ? "Out of Stock" : isMaxInCart ? "Max in cart" : quantityInCart > 0 ? "Add Another" : "Add to Cart"}
              </button>
              {cartError && (
                <p className="text-center text-red-400 font-medium">{cartError}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-3">
              <button
                onClick={handleWishlistClick}
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 border
                  ${isSaving 
                    ? 'bg-gray-800 text-gray-400 border-gray-700 cursor-not-allowed' 
                    : isSaved 
                      ? 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30' 
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {isSaving ? "⏳ Saving..." : isSaved ? "♥ Remove from Wishlist" : "♡ Add to Wishlist"}
              </button>
              {saveError && (
                <p className="text-center text-xs text-red-400 mt-1">Unable to save product. Please try again.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
