import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deleteMyAccount } from '../features/safety/api';

export default function DeleteAccountPage() {
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setErr(null); setBusy(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      nav('/', { replace: true, state: { deleted: true } });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Delete your account</h1>
      <div className="card mt-4 space-y-3 p-5">
        <p className="font-semibold">This is permanent and cannot be undone. We will erase:</p>
        <ul className="ml-5 list-disc text-slate2"><li>your profile and all three photos</li><li>any verification selfie</li><li>your likes, passes, matches and blocks</li>
          <li>your messages. Chats disappear for the people you matched with too.</li><li>reports you filed and reports filed about you</li></ul>
        <p className="text-slate2">We keep only a one-way hash of your account id and the deletion time. See the <Link to="/privacy" className="underline">privacy policy</Link>.</p>
        <label className="block"><span className="mb-1 block font-semibold">Type DELETE to confirm</span>
          <input className="field" value={text} onChange={e => setText(e.target.value)} autoComplete="off" /></label>
        {err && <p role="alert" className="text-bad">{err}</p>}
        <div className="flex gap-3"><Link to="/settings" className="btn-outline">Cancel</Link>
          <button className="btn-primary" disabled={text !== 'DELETE' || busy} onClick={run}>{busy ? 'Deleting…' : 'Delete my account'}</button></div>
      </div>
    </main>
  );
}
