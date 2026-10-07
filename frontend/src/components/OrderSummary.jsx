import React from 'react';
import { useCart } from '../context/CartContext';

const OrderSummary = ({ onPay, buttonState, hasInvalidItems }) => {
  const { cartItems, itemCount, subtotal } = useCart();

  return (
    <div className="glass rounded-2xl p-6 border border-white/5 shadow-xl shadow-black/50">
      <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
      
      <div className="flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto pr-2">
        {cartItems.map(item => (
          <div key={item.product._id} className="flex justify-between items-center text-sm">
            <span className="text-gray-300 truncate pr-4">{item.product.name} &times; {item.quantity}</span>
            <span className="text-gray-400 shrink-0">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
      
      <div className="border-t border-white/10 pt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Total Items</span>
          <span className="text-white">{itemCount}</span>
        </div>
        <div className="flex items-center justify-between font-bold">
          <span className="text-gray-200">Grand Total</span>
          <span className="text-2xl text-indigo-400">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
      </div>
      
      <button
        onClick={onPay}
        disabled={hasInvalidItems || buttonState !== 'idle'}
        className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
          ${(hasInvalidItems || buttonState !== 'idle')
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
            : 'bg-indigo-500 text-white hover:bg-indigo-400 active:scale-[0.98]'
          }`}
      >
        {buttonState === 'idle' ? 'Place Order & Pay' :
         buttonState === 'creating' ? 'Creating order...' :
         buttonState === 'opening' ? 'Opening payment...' : 'Verifying payment...'}
      </button>

      {hasInvalidItems && (
        <p className="mt-3 text-center text-sm text-amber-400 font-medium">
          Update quantities to match available stock
        </p>
      )}
    </div>
  );
};

export default OrderSummary;
