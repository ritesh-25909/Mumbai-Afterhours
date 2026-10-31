import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { useMyProfile } from '../features/profiles/useMyProfile';
import { updateProfile } from '../features/profiles/api';
import { basicsSchema, splitList } from '../lib/validation';
import { BasicsForm, type BasicsState } from '../components/profile/BasicsForm';
import { PhotoSlots } from '../components/photo-upload/PhotoSlots';

export default function ProfileSettingsPage() {
  const { uid, profile, reload } = useMyProfile();
  const [b, setB] = useState<BasicsState | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setHidden(profile.visibility_status === 'hidden');
    setB({ display_name: profile.display_name, date_of_birth: profile.date_of_birth, gender: profile.gender, interested_in: profile.interested_in,
      neighbourhood: profile.neighbourhood ?? '', bio: profile.bio ?? '', languages: profile.languages.join(', '), interests: profile.interests.join(', '),
      relationship_intention: profile.relationship_intention ?? '' });
  }, [profile]);

  if (!b || !uid) return <p className="text-slate2" role="status">Loading your profile…</p>;

  async function save() {
    setMsg(null);
    const r = basicsSchema.safeParse({ ...b, neighbourhood: b!.neighbourhood || undefined, languages: splitList(b!.languages, 10), interests: splitList(b!.interests), relationship_intention: b!.relationship_intention || undefined });
    if (!r.success) return setMsg({ ok: false, text: r.error.issues[0].message });
    setBusy(true);
    try {
      const d = r.data;
      await updateProfile(uid!, { display_name: d.display_name, gender: d.gender, interested_in: d.interested_in, neighbourhood: d.neighbourhood ?? null, bio: d.bio,
        languages: d.languages, interests: d.interests, relationship_intention: d.relationship_intention ?? null, visibility_status: hidden ? 'hidden' : 'visible' });
      await reload(); setMsg({ ok: true, text: 'Changes saved.' });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="card p-5"><h1 className="mb-1 text-xl font-extrabold">Your profile</h1>
        <p className="mb-4 text-sm"><Link to="/settings" className="font-semibold text-royal">Account and privacy settings</Link></p>
        <BasicsForm v={b} set={p => setB(s => ({ ...s!, ...p }))} lockDob />
        <label className="mt-4 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={hidden} onChange={e => setHidden(e.target.checked)} />
          <span><span className="font-semibold">Hide my profile</span><br /><span className="text-sm text-slate2">Hidden profiles do not appear in Discover. People you already matched with can still message you.</span></span></label>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.text}</p>}
        <button className="btn-primary mt-4" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
      </section>
      <section className="card p-5 md:order-last md:col-span-2"><h2 className="text-xl font-extrabold">Verification</h2>
        <p className="mt-1 flex items-center gap-2 text-slate2">{profile?.verified ? <><BadgeCheck className="h-5 w-5 text-royal" />You are verified.</> : 'Add a verified badge by submitting a selfie.'}</p>
        <Link to="/verify" className="btn-outline mt-3">{profile?.verified ? 'View status' : 'Verify my profile'}</Link></section>
      <section className="card p-5"><h2 className="mb-4 text-xl font-extrabold">Photos</h2>
        <p className="mb-3 text-slate2">Your published profile needs exactly three photos. Replace a photo to swap it.</p>
        <PhotoSlots uid={uid} />
      </section>
    </div>
  );
}
