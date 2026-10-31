import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/AuthProvider';
import { SettingsNav } from '../components/settings/SettingsNav';

export default function AccountSettingsPage() {
  const { session, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const isGoogle = session?.user.app_metadata?.provider === 'google';

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (pw.length < 8) return setMsg({ ok: false, text: 'Use at least 8 characters.' });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setPw(''); setMsg({ ok: true, text: 'Password updated.' });
  }
  async function signOutEverywhere() { await supabase.auth.signOut({ scope: 'global' }); }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-extrabold">Settings</h1>
      <SettingsNav />
      <div className="space-y-4">
        <section className="card p-5"><h2 className="font-extrabold">Sign-in</h2>
          <p className="mt-1 text-slate2">Signed in as <strong className="text-ink">{session?.user.email}</strong>{isGoogle && ' with Google'}.</p></section>
        {!isGoogle && (
          <form onSubmit={changePassword} className="card space-y-3 p-5"><h2 className="font-extrabold">Change password</h2>
            <label className="block"><span className="mb-1 block font-semibold">New password</span>
              <input className="field" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
            {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-ok' : 'text-bad'}>{msg.text}</p>}
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></form>)}
        <section className="card space-y-3 p-5"><h2 className="font-extrabold">Sessions</h2>
          <button className="btn-outline" onClick={signOut}>Log out on this device</button>
          <div><button className="btn-outline" onClick={signOutEverywhere}>Log out on all devices</button>
            <p className="mt-1 text-sm text-slate2">Ends every session, including other phones and browsers.</p></div></section>
        <section className="card space-y-2 p-5"><h2 className="font-extrabold">Plan</h2>
          <p className="text-slate2">You are on the Free plan.</p><Link to="/subscription" className="btn-outline">View plans</Link></section>
        <section className="card space-y-2 p-5"><h2 className="font-extrabold">Delete account</h2>
          <p className="text-slate2">Permanently erases your profile, photos, matches and messages.</p>
          <Link to="/delete-account" className="btn-outline">Delete my account</Link></section>
      </div>
    </div>
  );
}
