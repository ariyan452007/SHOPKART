import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerCustomer, getErrorMessage } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = (name, value) => {
    switch (name) {
      case 'fullName':
        return value.length < 2 ? 'Name must be at least 2 characters long' : '';
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email address' : '';
      case 'password':
        return value.length < 6 ? 'Password must be at least 6 characters long' : '';
      case 'phone':
        return !/^\d{10}$/.test(value) ? 'Phone number must be exactly 10 digits' : '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear field error on edit
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    // Clear server error if it exists
    if (serverError) {
      setServerError('');
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const errorMsg = validate(name, value);
    if (errorMsg) {
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields before submit
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const errorMsg = validate(key, formData[key]);
      if (errorMsg) newErrors[key] = errorMsg;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      await registerCustomer(formData);
      // Automatically redirect to login upon successful registration
      navigate('/login');
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900 to-gray-900"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-white">
          Create a ShopKart account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in instead
          </Link>
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="glass p-8 rounded-2xl shadow-xl shadow-black/50 border border-white/5 space-y-5" onSubmit={handleSubmit}>
          {serverError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-red-400 font-medium">{serverError}</span>
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium leading-6 text-gray-300">
              Full Name
            </label>
            <div className="mt-1.5">
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-lg border-0 bg-white/5 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ${errors.fullName ? 'ring-red-500/50 focus:ring-red-500' : 'ring-white/10 focus:ring-indigo-500'} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-all placeholder:text-gray-500`}
                placeholder="John Doe"
              />
            </div>
            {errors.fullName && <p className="mt-1.5 text-xs text-red-400">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-300">
              Email address
            </label>
            <div className="mt-1.5">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-lg border-0 bg-white/5 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ${errors.email ? 'ring-red-500/50 focus:ring-red-500' : 'ring-white/10 focus:ring-indigo-500'} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-all placeholder:text-gray-500`}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-300">
              Password
            </label>
            <div className="mt-1.5">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-lg border-0 bg-white/5 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ${errors.password ? 'ring-red-500/50 focus:ring-red-500' : 'ring-white/10 focus:ring-indigo-500'} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-all placeholder:text-gray-500`}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-300">
              Phone Number
            </label>
            <div className="mt-1.5">
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-lg border-0 bg-white/5 py-2.5 px-3.5 text-white shadow-sm ring-1 ring-inset ${errors.phone ? 'ring-red-500/50 focus:ring-red-500' : 'ring-white/10 focus:ring-indigo-500'} focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-all placeholder:text-gray-500`}
                placeholder="1234567890"
              />
            </div>
            {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || Object.keys(errors).some(k => errors[k] !== '')}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
