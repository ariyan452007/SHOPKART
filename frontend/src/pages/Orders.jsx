import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getOrders } from '../services/api';
import OrderCard from '../components/OrderCard';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getOrders(signal);
      setOrders(res.data.orders);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      if (err.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError("Unable to load your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchOrders(abortController.signal);
    return () => abortController.abort();
  }, [navigate]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-300 font-medium">Loading your orders...</p>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl border-red-500/20">
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button 
            onClick={() => fetchOrders()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all border border-white/10"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-white mb-2">You have not placed any orders yet.</h2>
          <Link 
            to="/products"
            className="group relative flex justify-center rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-all active:scale-[0.98] mt-6"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-900 to-gray-900"></div>
      
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">My Orders</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map(order => (
          <OrderCard key={order._id} order={order} />
        ))}
      </div>
    </div>
  );
};

export default Orders;
