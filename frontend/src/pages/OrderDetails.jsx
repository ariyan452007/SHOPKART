import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getOrderById } from '../services/api';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
        if (err.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(err.response?.status === 404 ? "Order not found" : "Unable to load order details.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
    
    return () => abortController.abort();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-300 font-medium">Loading details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <h2 className="text-2xl font-bold text-red-400 mb-4">{error || "Order not found"}</h2>
        <Link to="/orders" className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all font-medium border border-white/5">
          Back to Orders
        </Link>
      </div>
    );
  }

  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-900 to-gray-900"></div>
      
      <div className="flex items-center gap-4 mb-8">
        <Link to="/orders" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-white tracking-tight">Order Details</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/5 shadow-xl shadow-black/50">
            <div className="flex flex-col sm:flex-row justify-between border-b border-white/10 pb-4 mb-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <p className="font-mono text-gray-200">{order._id}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-gray-500 mb-1">Order Date</p>
                <p className="text-gray-200">{dateStr}</p>
              </div>
            </div>
            
            <h2 className="text-lg font-bold text-white mb-4">Items</h2>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-20 h-20 shrink-0 bg-gray-800 rounded-lg overflow-hidden border border-white/10">
                    <img 
                      src={item.image || `https://via.placeholder.com/150/1f2937/a5b4fc?text=${encodeURIComponent(item.name)}`} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-100 line-clamp-2">{item.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">₹{item.price.toLocaleString("en-IN")} &times; {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-indigo-400">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/5 shadow-xl shadow-black/50">
            <h2 className="text-lg font-bold text-white mb-4">Payment Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-green-400' : 'text-amber-400'}`}>
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Order Status</span>
                <span className="text-white font-medium">{order.status}</span>
              </div>
              {order.razorpayPaymentId && (
                <div className="flex flex-col pt-3 border-t border-white/10">
                  <span className="text-gray-400 mb-1">Transaction ID</span>
                  <span className="font-mono text-gray-300 text-xs break-all">{order.razorpayPaymentId}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-white/10 mt-3">
                <span className="text-gray-300 font-bold">Total Amount</span>
                <span className="text-xl font-bold text-indigo-400">₹{order.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/5 shadow-xl shadow-black/50">
            <h2 className="text-lg font-bold text-white mb-4">Shipping Details</h2>
            <div className="text-sm text-gray-300 space-y-1">
              <p className="font-bold text-white mb-2">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
              <p className="pt-2 text-gray-400">Phone: {order.shippingAddress.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
