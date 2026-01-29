import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  X
} from 'lucide-react';


interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { user, userPermissions } = useAuth();

  // Check if user has any permission for a module
  const hasModuleAccess = (moduleName: string): boolean => {
    return userPermissions.some(p => p.moduleName === moduleName);
  };

  const menuItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      show: true,
    },
    {
      path: '/users',
      icon: Users,
      label: 'User Management',
      show: hasModuleAccess('Users'),
    },
    {
      path: '/roles',
      icon: Shield,
      label: 'Role Management',
      show: hasModuleAccess('Roles'),
    }
  ];
  
 

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-linear-to-b from-gray-900 to-gray-800 text-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div>
              <h2 className="text-xl font-bold">Management System</h2>
              <p className="text-xs text-gray-400 mt-1">Role-Based Access</p>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-gray-400 hover:text-white transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold">
                  {user?.userName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user?.userName}</p>
             
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item) =>
                item.show ? (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </NavLink>
                  </li>
                ) : null
              )}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;