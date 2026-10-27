import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../../services/api';
import { STATUS_STYLES, FULFILMENT_STEPS, formatStatus, formatINR } from '../../utils/orderStatus';
import { handleImageError } from '../../utils/placeholder';

const StatCard = ({ label, value, hint }) => (
  <div className="glass rounded-2xl p-5 border border-white/5">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-3xl font-bold text-white mt-1 tabular-nums">{value}</p>
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

const StatsPanel = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const abortController = new AbortController();
    getAdminStats(abortController.signal)
      .then(res => setStats(res.data.stats))
      .catch(err => {
        if (err.code !== 'ERR_CANCELED') setError('Unable to load dashboard stats.');
      });
    return () => abortController.abort();
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const awaitingAction = (stats.ordersByStatus.PLACED || 0) + (stats.ordersByStatus.CONFIRMED || 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={formatINR(stats.revenue)} hint="Paid orders, excluding refunds" />
        <StatCard label="Paid orders" value={stats.paidOrders} />
        <StatCard label="Customers" value={stats.customers} />
        <StatCard label="Products" value={stats.products} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Orders by status</h2>
            {awaitingAction > 0 && (
              <button onClick={() => onNavigate('orders')} className="text-sm text-indigo-300 hover:text-indigo-200">
                {awaitingAction} awaiting fulfilment &rarr;
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {[...FULFILMENT_STEPS, 'CANCELLED'].map(status => (
              <li key={status} className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>{formatStatus(status)}</span>
                <span className="text-white font-semibold tabular-nums">{stats.ordersByStatus[status] || 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Low stock</h2>
            <button onClick={() => onNavigate('products')} className="text-sm text-indigo-300 hover:text-indigo-200">
              Manage products &rarr;
            </button>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-gray-400">Every product has 5 or more units in stock.</p>
          ) : (
            <ul className="space-y-3">
              {stats.lowStock.map(p => (
                <li key={p._id} className="flex items-center gap-3">
                  <img src={p.image} alt="" onError={handleImageError} className="w-10 h-10 rounded-lg object-cover bg-gray-800" />
                  <span className="flex-1 text-sm text-gray-200 truncate">{p.name}</span>
                  <span className={`text-sm font-bold tabular-nums ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {p.stock === 0 ? 'Out' : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
