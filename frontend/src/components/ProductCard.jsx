import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/600x400?text=No+Image';
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return <span className="text-red-400 font-medium text-sm">Out of stock</span>;
    if (stock < 5) return <span className="text-amber-400 font-medium text-sm">Only {stock} left</span>;
    return <span className="text-green-400 font-medium text-sm">{stock} units left</span>;
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
        <div className="absolute top-2 right-2 bg-indigo-500/90 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-md">
          {product.category}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-semibold text-white mb-1 truncate" title={product.name}>
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-auto pt-4">
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
      </div>
    </div>
  );
};

export default ProductCard;
