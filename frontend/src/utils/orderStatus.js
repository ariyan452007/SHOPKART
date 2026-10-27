export const STATUS_STYLES = {
  PENDING_PAYMENT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  PLACED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CONFIRMED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  SHIPPED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DELIVERED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const PAYMENT_STYLES = {
  PAID: 'text-green-400',
  PENDING: 'text-amber-400',
  FAILED: 'text-red-400',
  REFUNDED: 'text-sky-400',
  REFUND_PENDING: 'text-amber-400',
};

export const formatStatus = (status = '') =>
  status.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

// Mirrors Order.TRANSITIONS on the backend
export const NEXT_STATUS = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};

export const FULFILMENT_STEPS = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export const canCustomerCancel = (order) => ['PLACED', 'CONFIRMED'].includes(order.status);

export const formatINR = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
