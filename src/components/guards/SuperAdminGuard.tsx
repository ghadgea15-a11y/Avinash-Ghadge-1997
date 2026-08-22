import { Navigate, Outlet } from 'react-router-dom';
import { useSuperAdmin } from '../../context/SuperAdminAuthContext';

export const SuperAdminGuard = () => {
  const { user, isSuperAdmin, loading } = useSuperAdmin();

  if (loading) return <div>Loading Secure Session...</div>; // Real loading state
  
  if (!user || !isSuperAdmin) {
    // Unauthorized access redirect
    return <Navigate to="/super-admin/login" replace />;
  }

  return <Outlet />; // Allow access to nested Super Admin routes
};
