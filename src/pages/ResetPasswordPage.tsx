import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/AuthProvider';
import { Logo } from '../components/ui/Logo';

export default function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    nav('/discover', { replace: true });
  }
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4"><div className="w-full max-w-md"><div className="mb-6 text-center"><Logo /></div>
      <div className="card space-y-4 p-6"><h1 className="text-2xl font-extrabold">Choose a new password</h1>
        {loading ? <p role="status">Checking your link…</p> : !session ? (
          <><p className="text-slate2">This link has expired or was already used. Request a new one from the log-in page.</p><Link to="/login" className="btn-primary">Back to log in</Link></>) : (
          <form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1 block font-semibold">New password</span>
            <input className="field" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
            {err && <p role="alert" className="text-bad">{err}</p>}<button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button></form>)}
      </div></div></main>
  );
}
