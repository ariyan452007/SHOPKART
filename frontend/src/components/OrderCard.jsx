import React from 'react';
import { Link } from 'react-router-dom';
import { STATUS_STYLES, formatStatus } from '../utils/orderStatus';

const OrderCard = ({ order }) => {
  const shortId = order._id.slice(-8);
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <div className="glass rounded-2xl p-6 border border-white/5 shadow-xl shadow-black/50 hover:border-white/10 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-4 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-gray-300 font-medium">#{shortId}</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[order.status] || STATUS_STYLES.PENDING_PAYMENT}`}>
              {formatStatus(order.status)}
            </span>
          </div>
          <p className="text-sm text-gray-500">Ordered on {dateStr}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-xl font-bold text-indigo-400">₹{order.totalAmount.toLocaleString("en-IN")}</p>
        </div>
      </div>
      
      <div className="mb-6 space-y-2">
        {order.items.slice(0, 3).map((item, idx) => (
          <p key={idx} className="text-sm text-gray-300">
            <span className="text-gray-400 mr-2">{item.quantity} &times;</span>
            {item.name}
          </p>
        ))}
        {order.items.length > 3 && (
          <p className="text-sm text-gray-500 italic">+ {order.items.length - 3} more items</p>
        )}
      </div>
      
      <div className="flex justify-end">
        <Link 
          to={`/orders/${order._id}`}
          className="text-sm font-medium text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors border border-white/5"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default OrderCard;
