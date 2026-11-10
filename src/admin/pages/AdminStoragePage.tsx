import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, FileImage, HardDrive, RefreshCw } from 'lucide-react';
import { getAdminStorageUsage, type StorageBucketUsage } from '../api/storage';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export default function AdminStoragePage() {
  const [buckets, setBuckets] = useState<StorageBucketUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setBuckets(await getAdminStorageUsage()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load storage usage.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => buckets.reduce((acc, item) => ({
    files: acc.files + item.object_count,
    bytes: acc.bytes + item.total_bytes,
    databaseBytes: Math.max(acc.databaseBytes, item.database_bytes),
  }), { files: 0, bytes: 0, databaseBytes: 0 }), [buckets]);

  const label = (id: string) => id === 'profile-photos' ? 'Profile photos' : id === 'verification-selfies' ? 'Verification selfies' : id;

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#246BFD]">Platform resources</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#10213e]">Storage Usage</h1><p className="mt-2 text-sm text-slate-500">Supabase Storage usage across buckets, including stored object count and file sizes.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-[#174fc5] shadow-sm hover:bg-blue-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<p className="mt-1 text-xs">Apply the new Supabase migration, then refresh this page.</p></div>}
    <section className="grid gap-4 sm:grid-cols-2">
      <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Total storage used</p><HardDrive className="text-[#246BFD]" size={21}/></div><p className="mt-3 text-3xl font-bold text-[#10213e]">{loading ? '…' : formatBytes(totals.bytes)}</p><p className="mt-2 text-xs text-slate-400">Sum of stored file sizes</p></article>
      <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Stored files</p><Database className="text-[#246BFD]" size={21}/></div><p className="mt-3 text-3xl font-bold text-[#10213e]">{loading ? '…' : totals.files.toLocaleString('en-IN')}</p><p className="mt-2 text-xs text-slate-400">Objects across all buckets</p></article>
      <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Database size</p><Database className="text-[#246BFD]" size={21}/></div><p className="mt-3 text-3xl font-bold text-[#10213e]">{loading ? '…' : formatBytes(totals.databaseBytes)}</p><p className="mt-2 text-xs text-slate-400">PostgreSQL database footprint</p></article>
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-[#10213e]">Bucket breakdown</h2><p className="mt-1 text-xs text-slate-500">Usage is calculated from Supabase Storage object metadata.</p></div>
      {loading ? <p className="p-5 text-sm text-slate-500">Loading storage metrics…</p> : buckets.length === 0 ? <p className="p-5 text-sm text-slate-500">No stored objects found.</p> : <div className="divide-y divide-slate-100">{buckets.map(bucket => <div key={bucket.bucket_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#246BFD]"><FileImage size={19}/></span><div><p className="font-semibold text-slate-800">{label(bucket.bucket_id)}</p><p className="text-xs text-slate-400">{bucket.bucket_id} · {bucket.object_count.toLocaleString('en-IN')} files</p></div></div><p className="text-lg font-bold tabular-nums text-[#10213e]">{formatBytes(bucket.total_bytes)}</p></div>)}</div>}
    </section>
    <p className="text-xs leading-5 text-slate-400">Database size is the PostgreSQL database footprint; bucket usage is calculated from stored object metadata. These figures do not include bandwidth or represent your plan quota.</p>
  </div>;
}
