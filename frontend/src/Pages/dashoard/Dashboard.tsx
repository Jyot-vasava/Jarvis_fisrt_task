import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import type { Role } from '../../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out');
    navigate('/', { replace: true });
  };

  const userRoleName = (user?.roleId && typeof user.roleId === 'object' && 'roleName' in user.roleId) 
    ? (user.roleId as Role).roleName 
    : 'No Role';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Management Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">
                  Welcome, <span className="font-semibold text-gray-900">{user?.userName}</span>
                </p>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {userRoleName}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      
    </div>
  );
};

export default Dashboard;