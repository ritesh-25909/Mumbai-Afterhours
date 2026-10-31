import { useEffect, useState } from 'react';
import { useMyProfile } from '../features/profiles/useMyProfile';
import { getPrefs, savePrefs, updateProfile } from '../features/profiles/api';
import { listBlocks, unblock, type BlockedUser } from '../features/safety/api';
import { prefsSchema } from '../lib/validation';
import { SettingsNav } from '../components/settings/SettingsNav';

export default function PrivacySettingsPage() {
  const { uid, profile, reload } = useMyProfile();
  const [hidden, setHidden] = useState(false);
  const [showHood, setShowHood] = useState(true);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(45);
  const [pg, setPg] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<BlockedUser[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile || !uid) return;
    setHidden(profile.visibility_status === 'hidden'); setShowHood(profile.show_neighbourhood);
    getPrefs(uid).then(p => { if (p) { setMinAge(p.minimum_age); setMaxAge(p.maximum_age); setPg(p.preferred_gender); } });
  }, [profile, uid]);
  const loadBlocks = () => listBlocks().then(setBlocks).catch(e => { setBlocks([]); setMsg({ ok: false, text: e.message }); });
  useEffect(() => { loadBlocks(); }, []);

  async function save() {
    setMsg(null);
    const r = prefsSchema.safeParse({ minimum_age: minAge, maximum_age: maxAge });
    if (!r.success) return setMsg({ ok: false, text: r.error.issues[0].message });
    setBusy(true);
    try {
      await updateProfile(uid!, { visibility_status: hidden ? 'hidden' : 'visible', show_neighbourhood: showHood });
      await savePrefs(uid!, { minimum_age: minAge, maximum_age: maxAge, preferred_gender: pg });
      await reload(); setMsg({ ok: true, text: 'Saved.' });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  }
  async function doUnblock(id: string) {
    try { await unblock(id); await loadBlocks(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }
  if (!profile) return <p className="text-slate2" role="status">Loading…</p>;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-extrabold">Settings</h1>
      <SettingsNav />
      <div className="space-y-4">
        <section className="card space-y-4 p-5"><h2 className="font-extrabold">Visibility</h2>
          <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={hidden} onChange={e => setHidden(e.target.checked)} />
            <span><span className="font-semibold">Hide my profile</span><br /><span className="text-sm text-slate2">You will not appear in Discover. People you already matched with can still see your photos and message you.</span></span></label>
          <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={showHood} onChange={e => setShowHood(e.target.checked)} />
            <span><span className="font-semibold">Show my neighbourhood</span><br /><span className="text-sm text-slate2">When off, profile cards will not show your neighbourhood. We never show exact location.</span></span></label>
          <h2 className="pt-2 font-extrabold">Who I see</h2>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="mb-1 block font-semibold">Minimum age</span><input className="field" type="number" min={18} max={99} value={minAge} onChange={e => setMinAge(+e.target.value)} /></label>
            <label><span className="mb-1 block font-semibold">Maximum age</span><input className="field" type="number" min={18} max={99} value={maxAge} onChange={e => setMaxAge(+e.target.value)} /></label></div>
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-ok' : 'text-bad'}>{msg.text}</p>}
          <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></section>
        <section className="card p-5"><h2 className="font-extrabold">Notifications</h2>
          <p className="mt-1 text-slate2">Mumbai Afterhours does not send email or push notifications yet, so there is nothing to configure. New matches and messages appear while the app is open.</p></section>
        <section className="card p-5"><h2 className="font-extrabold">Blocked people</h2>
          {!blocks ? <p className="mt-2 text-slate2" role="status">Loading…</p> : blocks.length === 0 ? <p className="mt-2 text-slate2">You have not blocked anyone.</p> : (
            <ul className="mt-2 divide-y divide-line">{blocks.map(b => (
              <li key={b.user_id} className="flex items-center justify-between py-2"><span>{b.display_name}</span>
                <button className="btn-outline px-3 py-1.5" onClick={() => doUnblock(b.user_id)}>Unblock</button></li>))}</ul>)}
          <p className="mt-2 text-sm text-slate2">Unblocking does not reopen an old match or chat.</p></section>
      </div>
    </div>
  );
}
