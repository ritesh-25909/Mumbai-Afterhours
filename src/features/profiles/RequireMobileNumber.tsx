import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getMyMobileNumber } from './contact';

export function RequireMobileNumber() {
  const { session } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<'loading' | 'complete' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [checkedPath, setCheckedPath] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    if (!session?.user.id) return;
    setState('loading');
    getMyMobileNumber()
      .then(number => { if (active) { setState(number ? 'complete' : 'missing'); setCheckedPath(location.pathname); } })
      .catch(error => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Unable to check mobile number.');
        setCheckedPath(location.pathname);
        setState('error');
      });
    return () => { active = false; };
  }, [session?.user.id, location.pathname, retry]);

  if (state === 'loading' || checkedPath !== location.pathname) return <p className="p-8 text-slate-500" role="status">Checking account details…</p>;
  if (state === 'error') return <main className="grid min-h-screen place-items-center p-6"><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center"><p className="text-sm text-rose-700">{message}</p><button className="mt-4 rounded-xl bg-[#174fc5] px-4 py-2 text-sm font-semibold text-white" onClick={() => setRetry(value => value + 1)}>Retry</button></div></main>;

  if (state === 'missing' && location.pathname !== '/complete-phone') {
    return <Navigate to="/complete-phone" replace state={{ from: location.pathname }} />;
  }
  if (state === 'complete' && location.pathname === '/complete-phone') {
    return <Navigate to="/discover" replace />;
  }
  return <Outlet />;
}
