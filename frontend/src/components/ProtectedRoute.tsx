import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8">Carregando...</div>;
  if (!session) return <Navigate to="/admin/login" replace />;
  return children;
}
