import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { hasPermission as checkPermission, PERMISSIONS } from '../utils/permissions';

const AuthContext = createContext(null);

export const ALL_SYSTEM_ROLES = ['employee', 'manager', 'hr_admin', 'super_admin'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    const token = api.getToken();
    if (token) {
      try {
        const data = await api.getMe();
        const activeRole = api.getActiveRole();
        const userRoles = ALL_SYSTEM_ROLES;

        const effectiveRole = activeRole && userRoles.includes(activeRole)
          ? activeRole
          : (data.user?.active_role && userRoles.includes(data.user.active_role) ? data.user.active_role : data.user?.role || 'super_admin');

        api.setActiveRole(effectiveRole);
        setUser({
          ...data.user,
          roles: userRoles,
          role: effectiveRole,
          active_role: effectiveRole
        });
      } catch (err) {
        console.error('Failed to restore session:', err);
        api.setToken(null);
        api.setActiveRole(null);
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    api.setToken(data.token);
    const userRoles = ALL_SYSTEM_ROLES;
    const activeRole = data.user?.active_role || data.user?.role || 'super_admin';
    api.setActiveRole(activeRole);
    const resolvedUser = {
      ...data.user,
      roles: userRoles,
      role: activeRole,
      active_role: activeRole
    };
    setUser(resolvedUser);
    return resolvedUser;
  };

  const logout = () => {
    api.setToken(null);
    api.setActiveRole(null);
    setUser(null);
  };

  const switchActiveRole = async (newRole) => {
    if (!user) return;
    const requested = String(newRole).trim().toLowerCase();

    try {
      api.setActiveRole(requested);
      const res = await api.switchRole(requested);
      if (res?.token) {
        api.setToken(res.token);
      }
      const updatedUser = {
        ...user,
        roles: ALL_SYSTEM_ROLES,
        role: requested,
        active_role: requested
      };
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      // Fallback local update
      api.setActiveRole(requested);
      const updatedUser = {
        ...user,
        roles: ALL_SYSTEM_ROLES,
        role: requested,
        active_role: requested
      };
      setUser(updatedUser);
      return updatedUser;
    }
  };

  const updateUser = (updatedFields) => {
    setUser(prev => prev ? { ...prev, ...updatedFields } : prev);
  };

  const availableRoles = ALL_SYSTEM_ROLES;

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isHrAdmin = user?.role === 'hr_admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';

  const hasPermission = (permission) => {
    return checkPermission(user, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        switchActiveRole,
        availableRoles,
        activeRole: user?.role || 'employee',
        isAuthenticated: !!user,
        isSuperAdmin,
        isHrAdmin,
        isManager,
        isEmployee,
        hasPermission,
        PERMISSIONS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
