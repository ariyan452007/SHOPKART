import React, { useEffect, useState } from 'react';
import { getProducts, getCategories, deleteProduct, getErrorMessage } from '../../services/api';
import { formatINR } from '../../utils/orderStatus';
import { handleImageError } from '../../utils/placeholder';
import ProductForm from './ProductForm';

const ProductsPanel = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const abortController = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [productRes, categoryRes] = await Promise.all([
          getProducts({ limit: 50 }, abortController.signal),
          getCategories(abortController.signal)
        ]);
        setProducts(productRes.data.products);
        setCategories(categoryRes.data.categories);
      } catch (err) {
        if (err.code !== 'ERR_CANCELED') setError('Unable to load products.');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => abortController.abort();
  }, [reload]);

  const handleSaved = (product, isNew) => {
    setEditing(undefined);
    setNotice(isNew ? `Created "${product.name}"` : `Saved "${product.name}"`);
    setReload(r => r + 1);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? It will also be removed from customer carts and wishlists.`)) return;
    try {
      await deleteProduct(product._id);
      setProducts(prev => prev.filter(p => p._id !== product._id));
      setNotice(`Deleted "${product.name}"`);
    } catch (err) {
      setNotice('');
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-400">{products.length} products</p>
        <button
          onClick={() => { setNotice(''); setEditing(null); }}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-400"
        >
          + Add product
        </button>
      </div>

      {notice && <p className="text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-2">{notice}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={p.image} alt="" onError={handleImageError} className="w-10 h-10 rounded-lg object-cover bg-gray-800 shrink-0" />
                      <span className="text-white font-medium truncate max-w-[12rem]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">{p.category}</td>
                  <td className="px-4 py-3 text-right text-gray-200 tabular-nums">{formatINR(p.price)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${p.stock === 0 ? 'text-red-400' : p.stock < 5 ? 'text-amber-400' : 'text-gray-200'}`}>
                    {p.stock}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setNotice(''); setEditing(p); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 border border-red-500/30 hover:bg-red-500/10">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <ProductForm
          product={editing}
          categories={categories}
          onSaved={handleSaved}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
};

export default ProductsPanel;
