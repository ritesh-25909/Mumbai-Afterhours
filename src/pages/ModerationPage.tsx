import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ModerationNav } from '../components/layout/ModerationNav';

import {
  listPending,
  review,
  myRoles,
  REASONS,
  type Pending,
} from '../features/verification/api';

type Item = Pending & {
  selfieUrls: {
    front: string;
    left: string;
    right: string;
  };
  photoUrls: string[];
};

export default function ModerationPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reason, setReason] = useState('photos_dont_match');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);

    try {
      const rows = await listPending();

      const out: Item[] = [];

      for (const row of rows) {
        const selfiePaths = [
          row.selfie_front_path,
          row.selfie_left_path,
          row.selfie_right_path,
        ];

        if (selfiePaths.some(path => !path)) {
          console.error(
            'Verification request is missing one or more selfie paths:',
            row.request_id,
          );
          continue;
        }

        const [
          selfieResult,
          photoResult,
        ] = await Promise.all([
          supabase.storage
            .from('verification-selfies')
            .createSignedUrls(selfiePaths, 600),

          supabase.storage
            .from('profile-photos')
            .createSignedUrls(row.photo_paths, 600),
        ]);

        if (selfieResult.error) {
          throw new Error(
            `Could not load verification selfies: ${selfieResult.error.message}`,
          );
        }

        if (photoResult.error) {
          throw new Error(
            `Could not load profile photos: ${photoResult.error.message}`,
          );
        }

        const selfieMap = new Map(
          (selfieResult.data ?? []).map(item => [
            item.path,
            item.signedUrl,
          ]),
        );

        const frontUrl = selfieMap.get(row.selfie_front_path);
        const leftUrl = selfieMap.get(row.selfie_left_path);
        const rightUrl = selfieMap.get(row.selfie_right_path);

        if (!frontUrl || !leftUrl || !rightUrl) {
          throw new Error(
            `One or more selfie images could not be accessed for ${row.display_name}.`,
          );
        }

        out.push({
          ...row,
          selfieUrls: {
            front: frontUrl,
            left: leftUrl,
            right: rightUrl,
          },
          photoUrls: (photoResult.data ?? [])
            .map(item => item.signedUrl)
            .filter((url): url is string => Boolean(url)),
        });
      }

      setItems(out);
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : 'Could not load verification requests.',
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      try {
        const roles = await myRoles();

        const ok =
          roles.includes('moderator') ||
          roles.includes('admin') ||
          roles.includes('super_admin');

        if (!active) return;

        setAllowed(ok);

        if (ok) {
          await load();
        }
      } catch (error) {
        if (active) {
          setAllowed(false);
          setErr(
            error instanceof Error
              ? error.message
              : 'Unable to verify moderation access.',
          );
        }
      }
    };

    void checkAccess();

    return () => {
      active = false;
    };
  }, [load]);

  async function decide(
    item: Item,
    decision: 'approved' | 'rejected' | 'retry',
  ) {
    setBusy(item.request_id);
    setMsg(null);
    setErr(null);

    try {
      const deleted = await review(
        item.request_id,
        decision,
        decision === 'approved' ? undefined : reason,
      );

      if (decision === 'approved') {
        setMsg(
          deleted
            ? 'Verification approved. All three verification selfies were deleted.'
            : 'Verification approved, but one or more selfie files could not be deleted. Please check private Storage.',
        );
      } else if (decision === 'retry') {
        setMsg(
          deleted
            ? 'New three-angle selfies requested. Previous selfies deleted.'
            : 'Retry requested, but one or more old selfie files could not be deleted.',
        );
      } else {
        setMsg(
          deleted
            ? 'Verification rejected. All three verification selfies were deleted.'
            : 'Verification rejected, but one or more selfie files could not be deleted.',
        );
      }

      await load();
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : 'Could not record the moderation decision.',
      );
    } finally {
      setBusy(null);
    }
  }

  if (allowed === null) {
    return (
      <p className="text-slate2" role="status">
        Checking access…
      </p>
    );
  }

  if (!allowed) {
    return <Navigate to="/discover" replace />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">
          Three-angle selfie verification
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate2">
          Review all three selfie angles against the user's three profile
          photos. Approve only when the same person's appearance is
          consistent across the images.
        </p>
      </div>

      <ModerationNav />

      {msg && (
        <p className="card p-4 text-sm text-ok" role="status">
          {msg}
        </p>
      )}

      {err && (
        <p className="card p-4 text-sm text-bad" role="alert">
          {err}
        </p>
      )}

      {items.length === 0 && !err && (
        <div className="card p-6 text-center text-slate2">
          No three-angle verification requests are waiting for review.
        </div>
      )}

      {items.map(item => (
        <section
          key={item.request_id}
          className="card space-y-5 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">
                {item.display_name}
              </h2>
              <p className="text-xs text-slate2">
                Submitted: {new Date(item.submitted_at).toLocaleString()}
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-royal">
              Pending review
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold">
              Three verification selfies
            </h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(
                [
                  ['Front', item.selfieUrls.front],
                  ['Left angle', item.selfieUrls.left],
                  ['Right angle', item.selfieUrls.right],
                ] as const
              ).map(([label, url]) => (
                <figure key={label} className="min-w-0">
                  <img
                    src={url}
                    alt={`${label} verification selfie`}
                    className="aspect-[3/4] w-full rounded-lg bg-ink object-cover"
                  />
                  <figcaption className="mt-2 text-center text-xs font-semibold">
                    {label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold">
              Existing profile photos
            </h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {item.photoUrls.map((url, index) => (
                <figure key={`${item.request_id}-photo-${index}`}>
                  <img
                    src={url}
                    alt={`Profile photo ${index + 1}`}
                    className="aspect-[3/4] w-full rounded-lg bg-ink object-cover"
                  />
                  <figcaption className="mt-2 text-center text-xs text-slate2">
                    Profile {index + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-line pt-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">
                Rejection / retry reason
              </span>

              <select
                className="field w-full"
                value={reason}
                onChange={event => setReason(event.target.value)}
                aria-label="Verification rejection reason"
                disabled={busy === item.request_id}
              >
                {Object.entries(REASONS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={busy === item.request_id}
                onClick={() => void decide(item, 'approved')}
              >
                {busy === item.request_id ? 'Processing…' : 'Approve'}
              </button>

              <button
                type="button"
                className="btn-outline flex-1"
                disabled={busy === item.request_id}
                onClick={() => void decide(item, 'retry')}
              >
                Ask to retry
              </button>

              <button
                type="button"
                className="btn-outline flex-1"
                disabled={busy === item.request_id}
                onClick={() => void decide(item, 'rejected')}
              >
                Reject
              </button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
