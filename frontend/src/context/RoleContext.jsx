import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const RoleContext = createContext(null);

export const RoleProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    setPermissions(user?.permissions || []);
  }, [user]);

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (user.roles?.includes('Admin')) return true;
    return permissions.some((perm) => perm.module_name === module && perm.action === action);
  };

  const value = useMemo(() => ({
    user,
    permissions,
    hasPermission,
    isAdmin: user?.roles?.includes('Admin') || false
  }), [user, permissions]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const RequirePermission = ({ module, action, children }) => {
  const { hasPermission } = useRole();
  if (!hasPermission(module, action)) {
    return null;
  }
  return children;
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return ctx;
};

export default RoleContext;
