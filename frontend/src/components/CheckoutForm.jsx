import React, { useState } from 'react';

const CheckoutForm = ({ shippingAddress, setShippingAddress, setErrors, errors }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const fields = [
    { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
    { name: 'phone', label: 'Phone Number', type: 'text', placeholder: '+91 9876543210' },
    { name: 'addressLine1', label: 'Address Line 1', type: 'text', placeholder: '123 Main St' },
    { name: 'city', label: 'City', type: 'text', placeholder: 'Mumbai' },
    { name: 'state', label: 'State', type: 'text', placeholder: 'Maharashtra' },
    { name: 'pincode', label: 'Pincode', type: 'text', placeholder: '400001' }
  ];

  return (
    <div className="glass rounded-2xl p-6 border border-white/5 shadow-xl shadow-black/50">
      <h2 className="text-xl font-bold text-white mb-6">Shipping Address</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.name} className={f.name === 'addressLine1' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium leading-6 text-gray-300 mb-1">
              {f.label}
            </label>
            <input
              type={f.type}
              name={f.name}
              value={shippingAddress[f.name]}
              onChange={handleChange}
              placeholder={f.placeholder}
              className="block w-full rounded-md border-0 py-2.5 px-3 bg-white/5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 placeholder:text-gray-500 transition-all"
            />
            {errors[f.name] && <p className="mt-1 text-xs text-red-400">{errors[f.name]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheckoutForm;
