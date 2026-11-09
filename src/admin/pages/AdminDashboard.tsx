import { useCallback, useEffect, useState } from 'react';
import { Activity, Users, Heart, MessageCircle, Flag, ShieldCheck, UserCheck, RefreshCw, UserPlus } from 'lucide-react';
import { getAdminDashboardStats, type AdminDashboardStats } from '../api/dashboard';

const metrics = [
  { key: 'total_users', label: 'Total members', icon: Users, note: 'Non-deleted accounts' },
  { key: 'new_users_7d', label: 'New members · 7 days', icon: UserPlus, note: 'Recently registered accounts' },
  { key: 'new_users_30d', label: 'New members · 30 days', icon: Activity, note: 'Monthly acquisition' },
  { key: 'complete_profiles', label: 'Complete profiles', icon: UserCheck, note: 'Profiles marked complete' },
  { key: 'verified_users', label: 'Verified members', icon: ShieldCheck, note: 'Approved photo verification' },
  { key: 'active_matches', label: 'Active matches', icon: Heart, note: 'Current active connections' },
  { key: 'total_messages', label: 'Total messages', icon: MessageCircle, note: 'Non-deleted messages' },
  { key: 'open_reports', label: 'Open reports', icon: Flag, note: 'Awaiting moderation action' },
  { key: 'pending_verifications', label: 'Pending verification', icon: ShieldCheck, note: 'Awaiting manual review' },
] as const;

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStats(await getAdminDashboardStats()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load dashboard statistics.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#246BFD]">Platform overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#10213e]">Admin Dashboard</h1><p className="mt-2 text-sm text-slate-500">Live aggregate statistics returned by protected Supabase functions.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-[#174fc5] shadow-sm hover:bg-blue-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<button className="ml-3 font-bold underline" onClick={() => void load()}>Retry</button></div>}
    <section aria-label="Platform statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(({ key, label, icon: Icon, note }) => <article key={key} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_28px_rgba(16,33,62,.045)]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold tabular-nums text-[#10213e]">{loading && !stats ? <span className="inline-block h-9 w-20 animate-pulse rounded-lg bg-slate-100" aria-label="Loading" /> : (stats?.[key] ?? '—').toLocaleString('en-IN')}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#246BFD]"><Icon size={21} /></span></div>
        <p className="mt-3 text-xs text-slate-400">{note}</p>
      </article>)}
    </section>
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-[#0d2149] to-[#174fc5] p-5 text-white shadow-[0_12px_32px_rgba(23,79,197,.16)] sm:p-6">
      <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15"><ShieldCheck size={23} /></span><div><h2 className="text-lg font-bold">Server-side administrator checks are active</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-blue-100">Administrative data is requested through Supabase functions that perform role checks. The browser uses only the public anon key; privileged operations must remain enforced in PostgreSQL.</p></div></div>
    </section>
  </div>;
}
