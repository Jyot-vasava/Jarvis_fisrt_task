import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from '../Pages/auth/SignIn';
import Dashboard from '../Pages/dashoard/Dashboard';
import UserManagement from '../Pages/user/UserManagement';
import RoleManagement from '../Pages/role/RoleManagement';
import PrivateRoute from './PrivateRoutes';
import Layout from '../Compoents/Layout/Layout';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/users"
        element={
          <PrivateRoute>
            <Layout>
              <UserManagement />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route
        path="/roles"
        element={
          <PrivateRoute>
            <Layout>
              <RoleManagement />
            </Layout>
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;