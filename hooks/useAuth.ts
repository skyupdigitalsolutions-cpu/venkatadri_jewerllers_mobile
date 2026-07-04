// All auth state is now managed by AuthContext (shared across all components).
// Exporting useAuthContext as useAuth keeps every existing callsite unchanged.
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
