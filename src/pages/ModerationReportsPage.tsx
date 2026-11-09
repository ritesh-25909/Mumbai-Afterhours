import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { myRoles } from '../features/verification/api';
import { listOpenReports, listSuspended, resolveReport, reinstate, type OpenReport, type Suspended } from '../features/safety/api';
import { REPORT_CATEGORIES } from '../features/discovery/api';
import { ModerationNav } from '../components/layout/ModerationNav';
import { Modal } from '../components/ui/Modal';

export default function ModerationReportsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<OpenReport[]>([]);
  const [suspended, setSuspended] = useState<Suspended[]>([]);
  const [confirm, setConfirm] = useState<OpenReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try { const [r, s] = await Promise.all([listOpenReports(), listSuspended()]); setReports(r); setSuspended(s); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => {
    let active = true;
    const checkAccess = async () => {
      try {
        const roles = await myRoles();
        const ok = roles.includes('moderator') || roles.includes('admin') || roles.includes('super_admin');
        if (!active) return;
        setAllowed(ok);
        if (ok) await load();
      } catch (error) {
        if (active) {
          setAllowed(false);
          setErr(error instanceof Error ? error.message : 'Unable to verify moderation access.');
        }
      }
    };
    void checkAccess();
    return () => { active = false; };
  }, [load]);

  async function act(fn: () => Promise<void>) { setBusy(true); setErr(null); try { await fn(); setConfirm(null); await load(); } catch (e) { setErr((e as Error).message); setConfirm(null); } finally { setBusy(false); } }

  if (allowed === null) return <p className="text-slate2" role="status">Checking access…</p>;
  if (!allowed) return <Navigate to="/discover" replace />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Moderation</h1><ModerationNav />
      {err && <p role="alert" className="text-bad">{err}</p>}
      <h2 className="text-lg font-extrabold">Open reports</h2>
      {reports.length === 0 && !err && <p className="card p-6 text-center text-slate2">No open reports.</p>}
      {reports.map(r => (
        <section key={r.report_id} className="card space-y-2 p-4">
          <p className="font-bold">{REPORT_CATEGORIES[r.category] ?? r.category} <span className="font-normal text-slate2">· {new Date(r.created_at).toLocaleDateString('en-IN')}</span></p>
          <p>Reported: <strong>{r.reported_name}</strong> ({r.reports_against} report{r.reports_against === 1 ? '' : 's'} total). Reported by {r.reporter_name}.</p>
          {r.description && <p className="rounded bg-mist p-2">{r.description}</p>}
          <div className="flex gap-2"><button className="btn-outline" disabled={busy} onClick={() => act(() => resolveReport(r.report_id, 'dismiss'))}>Dismiss</button>
            <button className="btn-primary" disabled={busy} onClick={() => setConfirm(r)}>Suspend user</button></div>
        </section>))}
      <h2 className="pt-4 text-lg font-extrabold">Suspended accounts</h2>
      {suspended.length === 0 ? <p className="text-slate2">None.</p> : (
        <ul className="card divide-y divide-line">{suspended.map(s => <li key={s.user_id} className="flex items-center justify-between p-3"><span>{s.display_name}</span>
          <button className="btn-outline px-3 py-1.5" disabled={busy} onClick={() => act(() => reinstate(s.user_id))}>Reinstate</button></li>)}</ul>)}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Suspend ${confirm?.reported_name ?? ''}?`}>
        <p className="text-slate2">Their profile is hidden, matches and chats close, and they cannot like anyone. All open reports about them are marked actioned. You can reinstate them later.</p>
        <div className="flex gap-3"><button className="btn-outline flex-1" onClick={() => setConfirm(null)}>Cancel</button>
          <button className="btn-primary flex-1" disabled={busy} onClick={() => act(() => resolveReport(confirm!.report_id, 'suspend'))}>Suspend</button></div>
      </Modal>
    </div>
  );
}
