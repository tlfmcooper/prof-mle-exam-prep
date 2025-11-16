import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return { user: null, loading: true };
  }

  if (!user) {
    throw new Error('Authentication required. Please sign in.');
  }

  return { user, loading: false };
}
