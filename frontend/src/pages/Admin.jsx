import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatsPanel from '../components/admin/StatsPanel';
import ProductsPanel from '../components/admin/ProductsPanel';
import OrdersPanel from '../components/admin/OrdersPanel';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
];

const Admin = () => {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('overview');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/home" replace />;

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-gray-900 to-gray-900"></div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">Store admin</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 self-start" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && <StatsPanel onNavigate={setTab} />}
      {tab === 'orders' && <OrdersPanel />}
      {tab === 'products' && <ProductsPanel />}
    </div>
  );
};

export default Admin;
