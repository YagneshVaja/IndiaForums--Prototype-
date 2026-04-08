import { useAuth } from '../../contexts/AuthContext';

/**
 * Wraps interactive elements that require authentication.
 * If not authenticated, calls onAuthRequired instead of rendering children's actions.
 *
 * Usage:
 *   <AuthGate onAuthRequired={() => nav.setTab('myspace')}>
 *     <button onClick={handleComment}>Comment</button>
 *   </AuthGate>
 */
export default function AuthGate({ children, onAuthRequired, fallback = null }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return children;

  if (fallback) return fallback;

  return (
    <div onClick={onAuthRequired} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onAuthRequired(); }}>
      {children}
    </div>
  );
}
