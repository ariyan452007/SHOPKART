import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderById } from '../services/api';

const OrderSuccess = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchOrder = async () => {
      try {
        const res = await getOrderById(id, abortController.signal);
        setOrder(res.data.order);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        setError("Unable to load order details.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
    
    return () => abortController.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-300 font-medium">Loading...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <h2 className="text-2xl font-bold text-red-400 mb-4">{error || "Order not found"}</h2>
        <Link to="/products" className="text-indigo-400 hover:text-indigo-300">Continue Shopping</Link>
      </div>
    );
  }

  if (order.paymentStatus !== "PAID") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment not completed</h2>
        <p className="text-gray-400 mb-6">Your order is pending payment.</p>
        <Link to="/cart" className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400">Back to Cart</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center px-4 py-12">
      <div className="w-full max-w-2xl glass rounded-3xl p-8 border border-white/5 shadow-2xl">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Order Placed Successfully</h1>
        <p className="text-gray-400 mb-8">Your order has been saved successfully.</p>
        
        <div className="bg-white/5 rounded-xl p-6 text-left mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="font-mono text-gray-200">{order._id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="font-bold text-indigo-400">₹{order.totalAmount.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-white font-medium">{order.status}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/orders" className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all font-medium border border-white/5">
            View My Orders
          </Link>
          <Link to="/products" className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-all font-medium shadow-lg shadow-indigo-500/25">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
