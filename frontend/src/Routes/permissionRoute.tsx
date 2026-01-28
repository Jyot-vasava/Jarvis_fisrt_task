import { Navigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import type { ReactNode } from 'react';

interface PermissionRouteProps {
  children: ReactNode;
  moduleName: string;
  action: string;
}

const PermissionRoute = ({ children, moduleName, action }: PermissionRouteProps) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!hasPermission(moduleName, action)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PermissionRoute;