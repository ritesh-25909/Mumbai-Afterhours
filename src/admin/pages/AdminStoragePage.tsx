
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Database,
  FileImage,
  HardDrive,
  RefreshCw,
  Gauge,
  CircleAlert,
} from 'lucide-react';

import {
  getAdminStorageUsage,
  type StorageBucketUsage,
} from '../api/storage';

/*
 * Configure the actual Supabase Storage quota in bytes.
 *
 * Set VITE_SUPABASE_STORAGE_QUOTA_BYTES in your .env file.
 * Do not confuse database size with Storage quota.
 *
 * Example: 1 GiB = 1073741824 bytes.
 * This is an example only, not an assumed plan limit.
 */
const STORAGE_QUOTA_BYTES = Number(
  import.meta.env.VITE_SUPABASE_STORAGE_QUOTA_BYTES || 0
);

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}

function AdminStoragePage() {
  const [buckets, setBuckets] = useState<StorageBucketUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setBuckets(await getAdminStorageUsage());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to load storage usage.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      buckets.reduce(
        (acc, item) => ({
          files: acc.files + item.object_count,
          bytes: acc.bytes + item.total_bytes,
          databaseBytes: Math.max(
            acc.databaseBytes,
            item.database_bytes
          ),
        }),
        {
          files: 0,
          bytes: 0,
          databaseBytes: 0,
        }
      ),
    [buckets]
  );

  const quotaConfigured =
    Number.isFinite(STORAGE_QUOTA_BYTES) &&
    STORAGE_QUOTA_BYTES > 0;

  const remainingBytes = quotaConfigured
    ? Math.max(0, STORAGE_QUOTA_BYTES - totals.bytes)
    : 0;

  const usagePercent = quotaConfigured
    ? Math.min(
        100,
        (totals.bytes / STORAGE_QUOTA_BYTES) * 100
      )
    : 0;

  const isNearLimit = usagePercent >= 80;
  const isOverLimit = quotaConfigured &&
    totals.bytes > STORAGE_QUOTA_BYTES;

  const label = (id: string) => {
    if (id === 'profile-photos') return 'Profile photos';
    if (id === 'verification-selfies') return 'Verification selfies';
    return id;
  };

  const progressColor = isOverLimit
    ? 'bg-red-600'
    : isNearLimit
      ? 'bg-amber-500'
      : 'bg-[#246BFD]';

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#246BFD]">
            Platform resources
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#10213e]">
            Storage Usage
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor Supabase Storage consumption, remaining quota and database size.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-[#174fc5] shadow-sm hover:bg-blue-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {/* STORAGE OVERVIEW */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Total storage used
            </p>
            <HardDrive className="text-[#246BFD]" size={21} />
          </div>

          <p className="mt-3 text-3xl font-bold text-[#10213e]">
            {loading ? '…' : formatBytes(totals.bytes)}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Sum of stored file sizes
          </p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Storage limit
            </p>
            <Gauge className="text-[#246BFD]" size={21} />
          </div>

          <p className="mt-3 text-3xl font-bold text-[#10213e]">
            {loading
              ? '…'
              : quotaConfigured
                ? formatBytes(STORAGE_QUOTA_BYTES)
                : 'Not configured'}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Supabase plan storage quota
          </p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Remaining storage
            </p>
            <HardDrive className="text-[#246BFD]" size={21} />
          </div>

          <p className="mt-3 text-3xl font-bold text-[#10213e]">
            {loading
              ? '…'
              : quotaConfigured
                ? formatBytes(remainingBytes)
                : 'Unavailable'}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {isOverLimit
              ? 'Storage quota exceeded'
              : 'Available within configured quota'}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Stored files
            </p>
            <Database className="text-[#246BFD]" size={21} />
          </div>

          <p className="mt-3 text-3xl font-bold text-[#10213e]">
            {loading ? '…' : totals.files.toLocaleString('en-IN')}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Objects across all buckets
          </p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Database size
            </p>
            <Database className="text-[#246BFD]" size={21} />
          </div>

          <p className="mt-3 text-3xl font-bold text-[#10213e]">
            {loading ? '…' : formatBytes(totals.databaseBytes)}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            PostgreSQL database footprint
          </p>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Storage consumed
            </p>
            <Gauge className="text-[#246BFD]" size={21} />
          </div>

          <p className="mt-3 text-3xl font-bold text-[#10213e]">
            {loading
              ? '…'
              : quotaConfigured
                ? `${usagePercent.toFixed(2)}%`
                : '—'}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Percentage of configured quota
          </p>
        </article>
      </section>

      {/* STORAGE PROGRESS */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#10213e]">
              Storage consumption
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Monitor your available storage capacity.
            </p>
          </div>

          {quotaConfigured && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isOverLimit
                  ? 'bg-red-50 text-red-700'
                  : isNearLimit
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-blue-50 text-[#174fc5]'
              }`}
            >
              {isOverLimit
                ? 'Quota exceeded'
                : isNearLimit
                  ? 'Approaching limit'
                  : 'Within limit'}
            </span>
          )}
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-slate-500">
            Calculating storage consumption…
          </p>
        ) : quotaConfigured ? (
          <>
            <div className="mt-6 flex justify-between gap-3 text-sm">
              <span className="font-semibold text-[#10213e]">
                {formatBytes(totals.bytes)} used
              </span>
              <span className="text-slate-500">
                {formatBytes(STORAGE_QUOTA_BYTES)} total
              </span>
            </div>

            <div
              className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Storage quota used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(usagePercent.toFixed(2))}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
              <span>{usagePercent.toFixed(2)}% used</span>
              <span>{formatBytes(remainingBytes)} remaining</span>
            </div>

            {(isNearLimit || isOverLimit) && (
              <div
                className={`mt-5 flex items-start gap-3 rounded-xl p-4 text-sm ${
                  isOverLimit
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                <CircleAlert size={19} className="mt-0.5 shrink-0" />
                <p>
                  {isOverLimit
                    ? 'Your recorded storage usage exceeds the configured quota. Review your Supabase plan and storage usage.'
                    : 'Your storage usage has reached at least 80% of the configured quota. Consider reviewing large files.'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">
              Storage quota has not been configured.
            </p>
            <p className="mt-1">
              Set VITE_SUPABASE_STORAGE_QUOTA_BYTES to your actual Supabase plan quota to calculate remaining storage.
            </p>
          </div>
        )}
      </section>

      {/* BUCKET BREAKDOWN */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-[#10213e]">
            Bucket breakdown
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Usage is calculated from Supabase Storage object metadata.
          </p>
        </div>

        {loading ? (
          <p className="p-5 text-sm text-slate-500">
            Loading storage metrics…
          </p>
        ) : buckets.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            No stored objects found.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {buckets.map((bucket) => (
              <div
                key={bucket.bucket_id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#246BFD]">
                    <FileImage size={19} />
                  </span>

                  <div>
                    <p className="font-semibold text-slate-800">
                      {label(bucket.bucket_id)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {bucket.bucket_id} · {bucket.object_count.toLocaleString('en-IN')} files
                    </p>
                  </div>
                </div>

                <p className="text-lg font-bold tabular-nums text-[#10213e]">
                  {formatBytes(bucket.total_bytes)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-slate-400">
        Storage usage is calculated from stored object metadata. Database size is the PostgreSQL footprint and is separate from Storage quota. Remaining storage is calculated only when the actual plan quota is configured.
      </p>
    </div>
  );
}

export default AdminStoragePage;
