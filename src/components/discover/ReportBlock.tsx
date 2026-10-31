import { useState } from 'react';
import { Flag, Ban } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { REPORT_CATEGORIES, reportUser, blockUser } from '../../features/discovery/api';

export function ReportBlock({ uid, targetId, name, onBlocked }: { uid: string; targetId: string; name: string; onBlocked?: () => void }) {
  const [mode, setMode] = useState<'report' | 'block' | null>(null);
  const [cat, setCat] = useState('fake_profile');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const close = () => { setMode(null); setErr(null); setSent(false); setText(''); };

  async function run(fn: () => Promise<void>, after?: () => void) {
    setBusy(true); setErr(null);
    try { await fn(); if (after) { close(); after(); } else setSent(true); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="flex justify-center gap-6 text-sm text-slate2">
        <button className="flex items-center gap-1 hover:text-ink" onClick={() => setMode('report')}><Flag className="h-4 w-4" aria-hidden />Report</button>
        <button className="flex items-center gap-1 hover:text-ink" onClick={() => setMode('block')}><Ban className="h-4 w-4" aria-hidden />Block</button>
      </div>
      <Modal open={mode === 'report'} onClose={close} title={`Report ${name}`}>
        {sent ? (<><p role="status" className="text-ok">Report sent. We review reports privately. {name} is not told who reported them.</p>
          <button className="btn-primary w-full" onClick={close}>Done</button></>) : (<>
          <label className="block"><span className="mb-1 block font-semibold">What is the problem?</span>
            <select className="field" value={cat} onChange={e => setCat(e.target.value)}>{Object.entries(REPORT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block"><span className="mb-1 block font-semibold">Details (optional)</span>
            <textarea className="field min-h-24" maxLength={1000} value={text} onChange={e => setText(e.target.value)} /></label>
          {err && <p role="alert" className="text-bad">{err}</p>}
          <div className="flex gap-3"><button className="btn-outline flex-1" onClick={close}>Cancel</button>
            <button className="btn-primary flex-1" disabled={busy} onClick={() => run(() => reportUser(uid, targetId, cat, text))}>{busy ? 'Sending…' : 'Send report'}</button></div></>)}
      </Modal>
      <Modal open={mode === 'block'} onClose={close} title={`Block ${name}?`}>
        <p className="text-slate2">You will not see each other again, and any match or chat with {name} will close. This cannot be undone from the app yet.</p>
        {err && <p role="alert" className="text-bad">{err}</p>}
        <div className="flex gap-3"><button className="btn-outline flex-1" onClick={close}>Cancel</button>
          <button className="btn-primary flex-1" disabled={busy} onClick={() => run(() => blockUser(targetId), onBlocked)}>{busy ? 'Blocking…' : 'Block'}</button></div>
      </Modal>
    </>
  );
}
