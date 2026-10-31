import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Camera } from 'lucide-react';
import { useMyProfile } from '../features/profiles/useMyProfile';
import { getLatestRequest, submitSelfie, REASONS, type VRequest } from '../features/verification/api';

type Phase = 'idle' | 'camera' | 'captured' | 'submitting';

export default function SelfieVerificationPage() {
  const { uid, profile, reload } = useMyProfile();
  const [req, setReq] = useState<VRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const stop = useCallback(() => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }, []);
  useEffect(() => stop, [stop]);
  useEffect(() => { if (uid) getLatestRequest(uid).then(setReq).catch(e => setErr(e.message)).finally(() => setLoading(false)); }, [uid, done]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function startCamera() {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) return setErr('This browser cannot access a camera. Try another browser or device.');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setPhase('camera');
      requestAnimationFrame(() => { if (video.current && stream.current) { video.current.srcObject = stream.current; video.current.play().catch(() => {}); } });
    } catch (e) {
      const name = (e as DOMException).name;
      setErr(name === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access in your browser settings, then try again.'
        : name === 'NotFoundError' ? 'No camera was found on this device.' : 'The camera could not be started. Close other apps using it and retry.');
    }
  }

  async function capture() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.85));
    if (!b) return setErr('Could not capture the image. Try again.');
    stop(); setBlob(b); setPreview(URL.createObjectURL(b)); setPhase('captured');
  }

  async function submit() {
    if (!blob || !uid) return;
    setErr(null); setPhase('submitting');
    try { await submitSelfie(uid, blob); setDone(true); setBlob(null); setPreview(null); setPhase('idle'); await reload(); }
    catch (e) { setErr((e as Error).message); setPhase('captured'); }
  }

  if (loading || !profile) return <p className="text-slate2" role="status">Loading…</p>;
  const canStart = !req || req.status !== 'pending';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Verify your profile</h1>

      {profile.verified && <div className="card flex items-center gap-3 p-4" role="status"><BadgeCheck className="h-6 w-6 text-royal" />
        <p>You are verified. If you change any photo, you will need to verify again.</p></div>}
      {!profile.verified && req?.status === 'pending' && <div className="card p-4" role="status"><p className="font-semibold">Under review</p>
        <p className="text-slate2">A member of our team will compare your selfie to your three photos. This can take a few days.</p></div>}
      {!profile.verified && req && (req.status === 'rejected' || req.status === 'retry') && (
        <div className="card border-warn p-4" role="status"><p className="font-semibold">{req.status === 'retry' ? 'Please try again' : 'Not approved'}</p>
          <p className="text-slate2">{REASONS[req.rejection_reason_code ?? 'other'] ?? REASONS.other} You can submit a new selfie below.</p></div>)}
      {done && <p role="status" className="text-ok">Selfie submitted. It is now waiting for review.</p>}

      {!profile.verified && canStart && !done && (
        <section className="card space-y-4 p-5">
          <div>
            <h2 className="font-bold">How it works</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate2">
              <li>You take one selfie with your camera. Uploading from your gallery is not allowed.</li>
              <li>A person on our team compares it with your three profile photos.</li>
              <li>If approved, you get a blue badge. The badge means you passed this photo check. It is not an ID or background check, and it does not guarantee anyone's safety.</li>
              <li>This is a manual review. It is not automated liveness detection, so we do not claim it stops every kind of fake.</li>
              <li>Your selfie is stored privately, is not shown to other members, and is deleted when the review decision is recorded. We keep only the date and result.</li>
            </ul>
          </div>
          <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={phase !== 'idle'} />
            <span>I agree that Mumbai Afterhours may process my selfie to check it against my profile photos.</span></label>

          {phase === 'idle' && <button className="btn-primary" disabled={!consent} onClick={startCamera}><Camera className="h-5 w-5" />Turn on camera</button>}
          {phase === 'camera' && (<div className="space-y-3">
            <video ref={video} playsInline muted className="aspect-[3/4] w-full -scale-x-100 rounded-card bg-ink object-cover" aria-label="Camera preview" />
            <button className="btn-primary w-full" onClick={capture}>Take selfie</button></div>)}
          {(phase === 'captured' || phase === 'submitting') && preview && (<div className="space-y-3">
            <img src={preview} alt="Your captured selfie" className="aspect-[3/4] w-full -scale-x-100 rounded-card object-cover" />
            <div className="flex gap-3">
              <button className="btn-outline flex-1" disabled={phase === 'submitting'} onClick={() => { setBlob(null); setPreview(null); startCamera(); }}>Retake</button>
              <button className="btn-primary flex-1" disabled={phase === 'submitting'} onClick={submit}>{phase === 'submitting' ? 'Submitting…' : 'Submit for review'}</button></div></div>)}
          {err && <p role="alert" className="text-bad">{err}</p>}
        </section>)}
    </div>
  );
}
