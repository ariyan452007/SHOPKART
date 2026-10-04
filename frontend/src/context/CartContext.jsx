import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { getCart, addToCartApi, updateCartQuantity, removeFromCartApi, getErrorMessage } from '../services/api';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingIds, setPendingIds] = useState(new Set());

  const refreshCart = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await getCart(signal);
      setCartItems(res.data.cart || []);
      setError(null);
      return { success: true };
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return { success: false };
      
      if (err.response?.status === 401) {
        setCartItems([]);
        setError(null);
        return { success: false, status: 401 };
      }
      
      setError("Unable to load your cart.");
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    refreshCart(abortController.signal);
    return () => abortController.abort();
  }, [refreshCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setError(null);
  }, []);

  const addToCart = useCallback(async (productId) => {
    if (pendingIds.has(productId)) return { success: false };
    
    setPendingIds(prev => new Set(prev).add(productId));
    try {
      const res = await addToCartApi(productId);
      if (res.data.success) {
        setCartItems(res.data.cart);
        return { success: true };
      }
    } catch (err) {
      return { success: false, status: err.response?.status, message: getErrorMessage(err) };
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
    return { success: false, message: "Failed to add to cart" };
  }, [pendingIds]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (pendingIds.has(productId)) return { success: false };
    
    setPendingIds(prev => new Set(prev).add(productId));
    try {
      const res = await updateCartQuantity(productId, quantity);
      if (res.data.success) {
        setCartItems(res.data.cart);
        return { success: true };
      }
    } catch (err) {
      return { success: false, status: err.response?.status, message: getErrorMessage(err) };
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
    return { success: false, message: "Failed to update quantity" };
  }, [pendingIds]);

  const removeFromCart = useCallback(async (productId) => {
    if (pendingIds.has(productId)) return { success: false };
    
    setPendingIds(prev => new Set(prev).add(productId));
    try {
      const res = await removeFromCartApi(productId);
      if (res.data.success) {
        setCartItems(res.data.cart);
        return { success: true };
      }
    } catch (err) {
      return { success: false, status: err.response?.status, message: getErrorMessage(err) };
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
    return { success: false, message: "Failed to remove from cart" };
  }, [pendingIds]);

  const isPending = useCallback((productId) => {
    return pendingIds.has(productId);
  }, [pendingIds]);

  const getQuantity = useCallback((productId) => {
    const item = cartItems.find(item => item.product._id === productId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const itemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cartItems]);

  const value = {
    cartItems,
    loading,
    error,
    refreshCart,
    clearCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    isPending,
    getQuantity,
    itemCount,
    subtotal
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
