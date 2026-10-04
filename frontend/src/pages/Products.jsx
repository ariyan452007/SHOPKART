import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  
  const [count, setCount] = useState(0);
  const [savedIds, setSavedIds] = useState(new Set());
  const navigate = useNavigate();

  // Auth check and Wishlist fetch
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
          setSavedIds(ids);
        }
      } catch (err) {
        // Silent fail for wishlist fetch; grid still works with default state
      }
    };
    verifyAuth();
  }, [navigate]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch products
  useEffect(() => {
    if (authLoading) return;
    
    const abortController = new AbortController();
    
    const fetchProducts = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getProducts(
          { search: debouncedSearch, category, sort }, 
          abortController.signal
        );
        setProducts(res.data.products);
        setCount(res.data.count);
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
    
    return () => abortController.abort();
  }, [debouncedSearch, category, sort, authLoading, retryCount]);

  const handleWishlistChange = (productId, isSaved) => {
    setSavedIds(prev => {
      const newSet = new Set(prev);
      if (isSaved) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-900 to-gray-900"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Product Catalog</h1>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
          <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full sm:w-auto rounded-lg border-0 bg-white/5 py-2.5 pl-3 pr-8 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
            >
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Fashion">Fashion</option>
              <option value="Books">Books</option>
              <option value="Home">Home</option>
            </select>
            
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="block w-full sm:w-auto rounded-lg border-0 bg-white/5 py-2.5 pl-3 pr-8 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
            >
              <option value="">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {!loading && !error && (
        <p className="text-sm text-gray-400 mb-6">{count} {count === 1 ? 'product' : 'products'} found</p>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-indigo-300 font-medium">Loading products...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl border-red-500/20">
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 font-medium mb-4">Something went wrong while loading products.</p>
          <button 
            onClick={() => setRetryCount(c => c + 1)}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all border border-white/10"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl">
          <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-gray-400 font-medium text-lg">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(p => <ProductCard key={p._id} product={p} isWishlisted={savedIds.has(p._id)} onWishlistChange={handleWishlistChange} />)}
        </div>
      )}
    </div>
  );
};

export default Products;
