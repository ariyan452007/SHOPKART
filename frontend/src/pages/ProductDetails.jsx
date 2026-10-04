import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMe, getProductById, getErrorMessage } from '../services/api';
import axios from 'axios';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cartMsg, setCartMsg] = useState("");

  // Auth check
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await getMe();
        setAuthLoading(false);
      } catch (err) {
        navigate('/login', { replace: true });
      }
    };
    verifyAuth();
  }, [navigate]);

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

  const handleAddToCart = () => {
    if (product?.stock > 0) {
      setCartMsg("Added to cart (demo)");
      setTimeout(() => setCartMsg(""), 3000);
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
                disabled={isOutOfStock}
                className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-indigo-500/25 active:scale-[0.98] focus:ring-indigo-500"
              >
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              {cartMsg && (
                <p className="text-center text-green-400 font-medium animate-pulse">{cartMsg}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
