import { useAuth } from '../Context/AuthContext';
import type { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const token = localStorage.getItem('token');
  const { user } = useAuth();

  if (!token || !user) {
    throw new Error("Unauthorized access");
  }

  return <>{children}</>;
};

export default PrivateRoute;