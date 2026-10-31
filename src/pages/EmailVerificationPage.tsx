import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/ui/Logo';
import { appUrl } from '../lib/constants';

export default function EmailVerificationPage() {
  const email = (useLocation().state as { email?: string } | null)?.email ?? '';
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function resend() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: appUrl('/') } });
    setBusy(false);
    setMsg(error ? { ok: false, text: 'Could not resend yet. Wait a minute and try again.' } : { ok: true, text: 'Verification email sent.' });
  }
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4"><div className="w-full max-w-md"><div className="mb-6 text-center"><Logo /></div>
      <div className="card space-y-4 p-6"><h1 className="text-2xl font-extrabold">Check your email</h1>
        <p>We sent a verification link{email && <> to <strong>{email}</strong></>}. Open it to activate your account, then log in. Check your spam folder if you do not see it.</p>
        {email && <button className="btn-outline w-full" disabled={busy} onClick={resend}>{busy ? 'Sending…' : 'Resend email'}</button>}
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-ok' : 'text-bad'}>{msg.text}</p>}
        <Link to="/login" className="block text-center font-semibold text-royal">Back to log in</Link></div></div></main>
  );
}
