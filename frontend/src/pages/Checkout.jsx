import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CheckoutForm from '../components/CheckoutForm';
import OrderSummary from '../components/OrderSummary';
import { loadRazorpayScript } from '../utils/razorpay';
import { createPaymentOrder, verifyPayment } from '../services/api';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, loading, refreshCart, clearCart } = useCart();
  const hasInvalidItems = cartItems.some(item => item.product.stock === 0 || item.quantity > item.product.stock);
  
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '', phone: '', addressLine1: '', city: '', state: '', pincode: ''
  });
  const [errors, setErrors] = useState({});
  const [buttonState, setButtonState] = useState('idle'); // idle | creating | opening | verifying
  const [apiError, setApiError] = useState('');
  
  const isPaying = useRef(false);

  useEffect(() => {
    const init = async () => {
      const res = await refreshCart();
      if (res.status === 401) {
        navigate('/login', { replace: true });
      }
    };
    init();
  }, [refreshCart, navigate]);

  const validate = () => {
    const newErrors = {};
    const fields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    let isValid = true;

    for (const f of fields) {
      if (!shippingAddress[f] || shippingAddress[f].trim() === '') {
        newErrors[f] = 'This field is required';
        isValid = false;
      }
    }

    if (!newErrors.phone) {
      const phoneStr = shippingAddress.phone.replace(/[\s-]/g, '');
      if (!/^\+?\d{10,13}$/.test(phoneStr)) {
        newErrors.phone = 'Invalid phone number';
        isValid = false;
      }
    }

    if (!newErrors.pincode) {
      if (!/^\d{6}$/.test(shippingAddress.pincode)) {
        newErrors.pincode = 'Pincode must contain 6 digits.';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handlePay = async () => {
    if (isPaying.current) return;
    setApiError('');
    
    if (!validate()) return;
    
    isPaying.current = true;
    setButtonState('creating');

    const res = await loadRazorpayScript();
    if (!res) {
      setApiError("Unable to load the payment gateway. Check your connection and try again.");
      setButtonState('idle');
      isPaying.current = false;
      return;
    }

    try {
      const { data } = await createPaymentOrder(shippingAddress);
      
      setButtonState('opening');

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "ShopKart",
        description: "ShopKart Order",
        order_id: data.razorpayOrderId,
        prefill: {
          name: shippingAddress.fullName,
          contact: shippingAddress.phone
        },
        theme: {
          color: "#6366f1"
        },
        handler: async function (response) {
          setButtonState('verifying');
          try {
            await verifyPayment({
              shopKartOrderId: data.shopKartOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            clearCart();
            await refreshCart();
            navigate(`/order-success/${data.shopKartOrderId}`, { replace: true });
          } catch (err) {
            setApiError("Payment could not be verified. Your cart has not been cleared.");
            setButtonState('idle');
            isPaying.current = false;
          }
        },
        modal: {
          ondismiss: function () {
            setApiError("Payment cancelled. Your cart is unchanged.");
            setButtonState('idle');
            isPaying.current = false;
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function () {
        setApiError("Payment failed. Your cart has not been cleared. Please try again.");
        setButtonState('idle');
        isPaying.current = false;
      });
      
      paymentObject.open();

    } catch (err) {
      setApiError(err.response?.data?.message || "Something went wrong.");
      await refreshCart();
      setButtonState('idle');
      isPaying.current = false;
    }
  };

  if (loading && cartItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-300 font-medium">Loading checkout...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
          <Link 
            to="/products"
            className="group relative flex justify-center rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-all active:scale-[0.98] mt-6"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-900 to-gray-900"></div>
      
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">Checkout</h1>
      
      {apiError && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-500/30 text-red-400">
          {apiError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:flex-1 flex flex-col gap-4">
          <CheckoutForm 
            shippingAddress={shippingAddress} 
            setShippingAddress={setShippingAddress} 
            errors={errors} 
            setErrors={setErrors} 
          />
        </div>
        
        <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-24">
          <OrderSummary 
            onPay={handlePay} 
            buttonState={buttonState} 
            hasInvalidItems={hasInvalidItems} 
          />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
