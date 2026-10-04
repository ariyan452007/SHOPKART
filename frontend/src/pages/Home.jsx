import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, extractUser } from '../services/api';

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getMe();
        const extractedUser = extractUser(res);
        if (extractedUser) {
          setUser(extractedUser);
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative isolate px-6 pt-14 lg:px-8 flex-1 flex flex-col justify-center">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
        </div>
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-300 ring-1 ring-white/10 hover:ring-white/20 transition-all cursor-default">
              Welcome to ShopKart <span aria-hidden="true">&rarr;</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Welcome back, {user?.fullName}!
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            You have successfully authenticated using HttpOnly cookies. Your profile details are securely fetched from the backend.
          </p>
          
          <div className="mt-10 mx-auto max-w-md glass rounded-2xl p-8 text-left shadow-2xl shadow-black/50 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4">Profile Information</h3>
            <dl className="divide-y divide-white/10">
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-400">Full name</dt>
                <dd className="mt-1 text-sm leading-6 text-white sm:col-span-2 sm:mt-0 font-medium">{user?.fullName}</dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-400">Email address</dt>
                <dd className="mt-1 text-sm leading-6 text-white sm:col-span-2 sm:mt-0 font-medium">{user?.email}</dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-400">Phone number</dt>
                <dd className="mt-1 text-sm leading-6 text-white sm:col-span-2 sm:mt-0 font-medium">{user?.phone}</dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-400">Account ID</dt>
                <dd className="mt-1 text-sm leading-6 text-white sm:col-span-2 sm:mt-0 font-mono text-xs">{user?._id}</dd>
              </div>
            </dl>
          </div>
          
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate('/products')}
              className="group relative flex justify-center rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-all active:scale-[0.98]"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
