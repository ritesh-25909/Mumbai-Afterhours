import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { myRoles } from '../features/verification/api';

type AccessStatus = 'checking' | 'allowed' | 'denied';

export function AdminGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccessStatus>('checking');

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const roles = await myRoles();
        const allowed = roles.includes('admin') || roles.includes('super_admin');
        if (active) setStatus(allowed ? 'allowed' : 'denied');
      } catch {
        if (active) setStatus('denied');
      }
    };
    void verify();
    return () => { active = false; };
  }, []);

  if (status === 'checking') {
    return <div className="min-h-[45vh] p-8 text-slate2" role="status">Verifying administrator access…</div>;
  }
  if (status === 'denied') return <Navigate to="/discover" replace />;
  return <>{children}</>;
}
