import axios from 'axios';

/**
 * In production the app calls the same-origin `/api` path, which Netlify proxies
 * to the Render backend (see public/_redirects). Same-origin requests keep the
 * HttpOnly auth cookie first-party, so login also works in Safari / iOS, which
 * block third-party cookies. Set VITE_API_URL to override (e.g. local dev).
 */
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5001');

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * The free Render instance sleeps when idle and takes ~30-60s to wake up.
 * Retry safe (GET) requests that fail with a gateway/network error a few times
 * with backoff instead of showing an error on the first cold request.
 */
const MAX_RETRIES = 3;
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  const status = error.response?.status;
  const retriable = !error.response || [502, 503, 504].includes(status);
  if (!config || config.method !== 'get' || !retriable || axios.isCancel(error)) {
    return Promise.reject(error);
  }
  config.__retryCount = (config.__retryCount || 0) + 1;
  if (config.__retryCount > MAX_RETRIES) return Promise.reject(error);
  await new Promise(resolve => setTimeout(resolve, 2000 * config.__retryCount));
  if (config.signal?.aborted) return Promise.reject(error);
  return api(config);
});

export const wakeServer = () => api.get('/health').catch(() => {});

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
  if (params.page) queryParams.page = params.page;
  if (params.limit) queryParams.limit = params.limit;
  return api.get('/products', { params: queryParams, signal });
};

export const getProductById = (id, signal) => api.get(`/products/${id}`, { signal });
export const getCategories = (signal) => api.get('/products/categories', { signal });

export const addToWishlist = (productId) => api.post(`/wishlist/${productId}`);
export const getWishlist = (signal) => api.get('/wishlist', { signal });
export const removeFromWishlist = (productId) => api.delete(`/wishlist/${productId}`);
export const toggleWishlist = (productId) => api.patch(`/wishlist/${productId}/toggle`);
export const getWishlistCount = (signal) => api.get('/wishlist/count', { signal });

export const getCart = (signal) => api.get('/cart', { signal });
export const addToCartApi = (productId) => api.post(`/cart/${productId}`);
export const updateCartQuantity = (productId, quantity) => api.patch(`/cart/${productId}`, { quantity });
export const removeFromCartApi = (productId) => api.delete(`/cart/${productId}`);

export const createPaymentOrder = (shippingAddress) => api.post('/orders/create-payment-order', { shippingAddress });
export const verifyPayment = (payload) => api.post('/orders/verify-payment', payload);
export const getOrders = (signal) => api.get('/orders', { signal });
export const getOrderById = (id, signal) => api.get(`/orders/${id}`, { signal });
export const cancelOrder = (id, reason) => api.patch(`/orders/${id}/cancel`, { reason });

// Admin
export const getAdminStats = (signal) => api.get('/admin/stats', { signal });
export const getAdminOrders = (params = {}, signal) => api.get('/admin/orders', { params, signal });
export const updateOrderStatus = (id, status) => api.patch(`/admin/orders/${id}/status`, { status });
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
