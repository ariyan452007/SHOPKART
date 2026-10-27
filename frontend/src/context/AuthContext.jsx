import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getMe, extractUser } from '../services/api';

const AuthContext = createContext(null);

// eslint-disable-next-line react/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Holds the logged-in customer (or null). The session itself lives in the
 * HttpOnly cookie; this only caches the profile returned by GET /customers/me.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe();
      const me = extractUser(res);
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => setUser(null), []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
};
