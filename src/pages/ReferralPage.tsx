import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Gift, Share2, Users, Sparkles } from 'lucide-react';
import { getReferralDashboard, type ReferralDashboard } from '../features/referrals/api';

export default function ReferralPage() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const link = useMemo(() => data?.referral_code ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/?ref=${data.referral_code}` : '', [data?.referral_code]);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getReferralDashboard()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load referrals.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setNotice('Referral link copied.');
  }
  async function share() {
    if (!link) return;
    const payload = { title: 'Join Mumbai Afterhours', text: 'Meet someone beyond the ordinary. Join me on Mumbai Afterhours!', url: link };
    if (navigator.share) {
      try { await navigator.share(payload); } catch { /* User cancelled share sheet. */ }
    } else {
      await copyLink();
    }
  }

  if (loading) return <div className="py-16 text-center text-slate-500">Loading your referral dashboard…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}<button onClick={load} className="ml-3 font-bold underline">Retry</button></div>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#071b3c] via-[#103b83] to-[#1760c8] p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-center gap-2 text-blue-100"><Gift className="h-5 w-5"/><span className="text-sm font-semibold">Mumbai Afterhours referrals</span></div>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Bring your people. Earn more likes.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Invite genuine friends to join the community. When a new member creates their profile through your invite, you earn 10 bonus likes.</p>
        <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Your personal referral link</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1 break-all rounded-xl bg-black/15 px-3 py-3 text-sm">{link}</div>
            <button onClick={copyLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50"><Copy className="h-4 w-4"/>Copy</button>
          </div>
          <button onClick={share} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e9f1ff] px-4 py-3 text-sm font-extrabold text-[#123d85] hover:bg-white sm:w-auto"><Share2 className="h-4 w-4"/>Share Invite</button>
          {notice && <p role="status" className="mt-2 text-xs text-blue-100">{notice}</p>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Users className="h-5 w-5 text-blue-600"/><p className="mt-3 text-2xl font-extrabold text-slate-900">{data.successful_referrals}</p><p className="text-xs font-semibold text-slate-500">Successful referrals</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Sparkles className="h-5 w-5 text-amber-500"/><p className="mt-3 text-2xl font-extrabold text-slate-900">{data.total_bonus_earned}</p><p className="text-xs font-semibold text-slate-500">Bonus likes earned</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Gift className="h-5 w-5 text-emerald-600"/><p className="mt-3 text-2xl font-extrabold text-slate-900">{data.available_bonus_credits}</p><p className="text-xs font-semibold text-slate-500">Bonus likes available</p></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">Referral history</h2><p className="mt-1 text-xs text-slate-500">Each successful new member earns you 10 bonus likes.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Code: {data.referral_code}</span></div>
        {data.history.length ? <div className="mt-4 divide-y divide-slate-100">{data.history.map((item, index) => <div key={`${item.created_at}-${index}`} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold text-slate-800">{item.invitee_name}</p><p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">+{item.bonus_awarded} credits</span></div>)}</div> : <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No successful referrals yet. Share your link to invite your first friend.</div>}
      </section>
    </div>
  );
}
