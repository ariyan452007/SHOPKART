import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const registerCustomer = (data) => api.post('/customers/register', data);
export const loginCustomer = (data) => api.post('/customers/login', data);
export const getMe = () => api.get('/customers/me');
export const logoutCustomer = () => api.post('/customers/logout');

export const extractUser = (res) => {
  const user = res?.data?.customer || res?.data?.user || res?.data?.data || res?.data;
  if (user) {
    user.fullName = user.fullName || user.name;
    user.phone = user.phone || user.phoneNumber;
  }
  return user;
};

export const getErrorMessage = (err) => {
  return err.response?.data?.message || "Something went wrong. Please try again.";
};

export const getProducts = (params = {}, signal) => {
  const queryParams = {};
  if (params.search && params.search.trim() !== "") queryParams.search = params.search;
  if (params.category && params.category.trim() !== "" && params.category !== "All") queryParams.category = params.category;
  if (params.sort && params.sort.trim() !== "") queryParams.sort = params.sort;
  return api.get('/products', { params: queryParams, signal });
};

export const getProductById = (id, signal) => api.get(`/products/${id}`, { signal });

export const addToWishlist = (productId) => api.post(`/wishlist/${productId}`);
export const getWishlist = (signal) => api.get('/wishlist', { signal });
export const removeFromWishlist = (productId) => api.delete(`/wishlist/${productId}`);
export const toggleWishlist = (productId) => api.patch(`/wishlist/${productId}/toggle`);
export const getWishlistCount = (signal) => api.get('/wishlist/count', { signal });

export const getCart = (signal) => api.get('/cart', { signal });
export const addToCartApi = (productId) => api.post(`/cart/${productId}`);
export const updateCartQuantity = (productId, quantity) => api.patch(`/cart/${productId}`, { quantity });
export const removeFromCartApi = (productId) => api.delete(`/cart/${productId}`);
