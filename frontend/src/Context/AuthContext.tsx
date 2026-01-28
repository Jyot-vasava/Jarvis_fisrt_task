import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Module, Role, User } from '../types';
import axios, { type AxiosError } from 'axios';
import { toast } from 'react-toastify';

export interface AuthContextType {
  user: User | null;
  logout: () => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  hasPermission: (moduleName: string, action: string) => boolean;
  hasAnyPermission: (permissions: Array<{moduleName: string, action: string}>) => boolean;
  userPermissions: Array<{moduleId: string, moduleName: string, action: string}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUserState] = useState<User | null>(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) as User : null;
  });

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user?._id){
        toast.error('No token or user ID found. Please log in again.');
        return;
      } 

      const response = await axios.get<User>(`http://localhost:3000/api/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedUser = response.data;
      setUserState(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401 || axiosError.response?.status === 404) {
        logout();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const userPermissions = useMemo(() => {
    if (!user) return [];
    
    const permissions: Array<{moduleId: string, moduleName: string, action: string}> = [];
    
    // If roleId is populated
    if (user.roleId && typeof user.roleId === 'object' && 'permissions' in user.roleId) {
      const role = user.roleId as Role;
      if (role.status === 'Active' && role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((perm: Module) => {
          if (typeof perm === 'object' && 'moduleName' in perm && 'action' in perm) {
            permissions.push({
              moduleId: perm._id,
              moduleName: perm.moduleName,
              action: perm.action
            });
          }
        });
      }
    }
    
    return permissions;
  }, [user]);

  const hasPermission = useCallback((moduleName: string, action: string): boolean => {
    return userPermissions.some(p => p.moduleName === moduleName && p.action === action);
  }, [userPermissions]);

  const hasAnyPermission = useCallback((permissions: Array<{moduleName: string, action: string}>): boolean => {
    return permissions.some(p => userPermissions.some(
      up => up.moduleName === p.moduleName && up.action === p.action
    ));
  }, [userPermissions]);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUserState(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const contextValue = useMemo(() => ({
    user,
    logout,
    setUser,
    refreshUser,
    hasPermission,
    hasAnyPermission,
    userPermissions
  }), [user, logout, setUser, refreshUser, hasPermission, hasAnyPermission, userPermissions]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth };