import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getOrderById, cancelOrder, getErrorMessage } from '../services/api';
import { STATUS_STYLES, PAYMENT_STYLES, FULFILMENT_STEPS, formatStatus, canCustomerCancel } from '../utils/orderStatus';
import { PLACEHOLDER_IMAGE, handleImageError } from '../utils/placeholder';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const [cancelError, setCancelError] = useState('');

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

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      const res = await cancelOrder(order._id);
      setOrder(res.data.order);
      setCancelMessage(res.data.message);
      setConfirmingCancel(false);
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const historyFor = (status) => order.statusHistory?.find(h => h.status === status);
  const isCancelled = order.status === 'CANCELLED';
  const reachedIndex = FULFILMENT_STEPS.indexOf(order.status);

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
                      src={item.image || PLACEHOLDER_IMAGE}
                      onError={handleImageError} 
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
                <span className={`font-bold ${PAYMENT_STYLES[order.paymentStatus] || 'text-amber-400'}`}>
                  {formatStatus(order.paymentStatus)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Order Status</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[order.status] || ''}`}>{formatStatus(order.status)}</span>
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
            <h2 className="text-lg font-bold text-white mb-4">Order Tracking</h2>
            {isCancelled ? (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm">
                <p className="font-bold text-red-300">Order cancelled</p>
                {order.cancelReason && <p className="text-gray-300 mt-1">{order.cancelReason}</p>}
                <p className="text-gray-400 mt-2">
                  {order.paymentStatus === 'REFUNDED'
                    ? `Refund of ₹${order.totalAmount.toLocaleString("en-IN")} issued to your original payment method.`
                    : 'Your refund is being processed.'}
                </p>
              </div>
            ) : (
              <ol className="relative border-l border-white/10 ml-2 space-y-5">
                {FULFILMENT_STEPS.map((step, idx) => {
                  const done = idx <= reachedIndex;
                  const entry = historyFor(step);
                  return (
                    <li key={step} className="ml-5">
                      <span className={`absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 ${done ? 'bg-indigo-500 border-indigo-300' : 'bg-gray-800 border-gray-600'}`} />
                      <p className={`text-sm font-semibold ${done ? 'text-white' : 'text-gray-500'}`}>{formatStatus(step)}</p>
                      {entry && (
                        <p className="text-xs text-gray-400">
                          {new Date(entry.at).toLocaleString("en-IN", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {cancelMessage && (
              <p className="mt-4 text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-2">{cancelMessage}</p>
            )}

            {canCustomerCancel(order) && (
              <div className="mt-6 pt-4 border-t border-white/10">
                {confirmingCancel ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">Cancel this order? Your payment will be refunded.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-400 disabled:opacity-60"
                      >
                        {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                      </button>
                      <button
                        onClick={() => setConfirmingCancel(false)}
                        disabled={cancelling}
                        className="flex-1 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10"
                      >
                        Keep order
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingCancel(true)}
                    className="w-full py-2 rounded-lg text-sm font-medium text-red-300 border border-red-500/30 hover:bg-red-500/10"
                  >
                    Cancel order
                  </button>
                )}
                {cancelError && <p className="mt-2 text-sm text-red-400">{cancelError}</p>}
              </div>
            )}
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
