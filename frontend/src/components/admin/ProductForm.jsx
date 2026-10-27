import React, { useEffect, useState } from 'react';
import { createProduct, updateProduct, getProductById, getErrorMessage } from '../../services/api';
import { handleImageError } from '../../utils/placeholder';

const EMPTY = { name: '', description: '', category: '', image: '', price: '', stock: '' };

const inputClass = "block w-full rounded-lg border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm placeholder:text-gray-500";

/**
 * Create / edit form shown in a modal. `product` is null when creating.
 */
const ProductForm = ({ product, categories, onSaved, onClose }) => {
  const [form, setForm] = useState(product
    ? { ...EMPTY, ...product, price: String(product.price), stock: String(product.stock) }
    : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // The catalogue list omits descriptions, so load the full product when editing
  useEffect(() => {
    if (!product) return;
    const abortController = new AbortController();
    getProductById(product._id, abortController.signal)
      .then(res => setForm(prev => ({ ...prev, description: res.data.product.description || '' })))
      .catch(() => {});
    return () => abortController.abort();
  }, [product]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    for (const field of ['name', 'description', 'category', 'image']) {
      if (!form[field].trim()) return `${field[0].toUpperCase() + field.slice(1)} is required`;
    }
    if (!/^https?:\/\//.test(form.image.trim())) return 'Image must be an http(s) URL';
    if (!(Number(form.price) > 0)) return 'Price must be greater than 0';
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0 || form.stock === '') return 'Stock must be a whole number of 0 or more';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      image: form.image.trim(),
      price: Number(form.price),
      stock: Number(form.stock)
    };

    setSaving(true);
    try {
      const res = product ? await updateProduct(product._id, payload) : await createProduct(payload);
      onSaved(res.data.product, !product);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 rounded-2xl border border-white/10 shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{product ? 'Edit product' : 'New product'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close">&times;</button>
        </div>

        <div>
          <label htmlFor="pf-name" className="block text-sm text-gray-300 mb-1">Name</label>
          <input id="pf-name" name="name" value={form.name} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pf-description" className="block text-sm text-gray-300 mb-1">Description</label>
          <textarea id="pf-description" name="description" rows={3} value={form.description} onChange={handleChange} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pf-price" className="block text-sm text-gray-300 mb-1">Price (₹)</label>
            <input id="pf-price" name="price" type="number" min="1" step="1" value={form.price} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pf-stock" className="block text-sm text-gray-300 mb-1">Stock</label>
            <input id="pf-stock" name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="pf-category" className="block text-sm text-gray-300 mb-1">Category</label>
          <input id="pf-category" name="category" list="pf-categories" value={form.category} onChange={handleChange} className={inputClass} placeholder="Pick or type a new one" />
          <datalist id="pf-categories">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="pf-image" className="block text-sm text-gray-300 mb-1">Image URL</label>
          <input id="pf-image" name="image" value={form.image} onChange={handleChange} className={inputClass} placeholder="https://..." />
          {form.image.trim() && (
            <img src={form.image} alt="Preview" onError={handleImageError} className="mt-2 h-32 w-full object-cover rounded-lg bg-gray-800" />
          )}
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-60">
            {saving ? 'Saving...' : product ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
