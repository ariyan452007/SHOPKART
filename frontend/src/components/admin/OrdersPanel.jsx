import React, { useEffect, useState } from 'react';
import { getAdminOrders, updateOrderStatus, getErrorMessage } from '../../services/api';
import { STATUS_STYLES, PAYMENT_STYLES, NEXT_STATUS, FULFILMENT_STEPS, formatStatus, formatINR } from '../../utils/orderStatus';

const FILTERS = ['', ...FULFILMENT_STEPS, 'CANCELLED'];

const OrderRow = ({ order, onUpdated }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = NEXT_STATUS[order.status] || [];

  const changeStatus = async (status) => {
    if (status === 'CANCELLED' && !window.confirm('Cancel this order and refund the customer?')) return;
    setBusy(true);
    setError('');
    try {
      const res = await updateOrderStatus(order._id, status);
      onUpdated({ ...res.data.order, user: order.user });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-xl p-4 border border-white/5 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-gray-300">#{order._id.slice(-8)}</span>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[order.status]}`}>{formatStatus(order.status)}</span>
          <span className={`text-xs font-semibold ${PAYMENT_STYLES[order.paymentStatus] || ''}`}>{formatStatus(order.paymentStatus)}</span>
        </div>
        <p className="text-sm text-white mt-1 truncate">
          {order.user?.fullName || 'Deleted customer'} <span className="text-gray-500">· {order.user?.email}</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {' · '}{order.items.reduce((n, i) => n + i.quantity, 0)} items
          {' · '}{order.shippingAddress.city}, {order.shippingAddress.state}
        </p>
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <span className="text-lg font-bold text-indigo-300 tabular-nums">{formatINR(order.totalAmount)}</span>
        <div className="flex gap-2">
          {next.map(status => (
            <button
              key={status}
              onClick={() => changeStatus(status)}
              disabled={busy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${status === 'CANCELLED'
                ? 'text-red-300 border-red-500/30 hover:bg-red-500/10'
                : 'bg-indigo-500 text-white border-indigo-400 hover:bg-indigo-400'}`}
            >
              {status === 'CANCELLED' ? 'Cancel' : `Mark ${formatStatus(status).toLowerCase()}`}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-red-400 lg:basis-full">{error}</p>}
    </div>
  );
};

const OrdersPanel = () => {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const abortController = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getAdminOrders({ status: status || undefined, page }, abortController.signal);
        setOrders(res.data.orders);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        if (err.code !== 'ERR_CANCELED') setError('Unable to load orders.');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => abortController.abort();
  }, [status, page]);

  const handleUpdated = (updated) => {
    setOrders(prev => prev
      .map(o => (o._id === updated._id ? updated : o))
      .filter(o => !status || o.status === status));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f || 'all'}
            onClick={() => { setStatus(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${status === f ? 'bg-white/15 text-white border-white/30' : 'text-gray-400 border-white/10 hover:text-white'}`}
          >
            {f ? formatStatus(f) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400 py-12 text-center glass rounded-2xl">No orders{status ? ` with status "${formatStatus(status)}"` : ''} yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map(o => <OrderRow key={o._id} order={o} onUpdated={handleUpdated} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-gray-200 disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-gray-200 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
};

export default OrdersPanel;
