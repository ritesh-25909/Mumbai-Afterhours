
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthProvider';
import { useMyProfile } from '../features/profiles/useMyProfile';

import {
  fetchCandidates,
  likeUser,
  passUser,
  type Candidate,
} from '../features/discovery/api';

import { localMatches } from '../features/matches/useMatchNotifications';
import { ProfileCard } from '../components/discover/ProfileCard';
import { ReportBlock } from '../components/discover/ReportBlock';
import { Modal } from '../components/ui/Modal';

import {
  getCurrentLocation,
  getDistanceKm,
  getNeighbourhoodCoordinates,
  type Coordinates,
} from '../features/location/distance';

type CandidateWithDistance = Candidate & {
  distanceKm: number | null;
};

export default function DiscoverPage() {
  const { session } = useAuth();
  const uid = session!.user.id;

  const { profile, loading: profileLoading } = useMyProfile();

  const [queue, setQueue] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [matched, setMatched] = useState<Candidate | null>(null);

  const [myLocation, setMyLocation] =
    useState<Coordinates | null>(null);

  const handled = useRef(new Set<string>());
  const loadingMore = useRef(false);
  const locationAttempted = useRef(false);

  // =====================================================
  // LOCATION
  // GPS is preferred. Saved neighbourhood is the fallback.
  // No location banner or card is displayed.
  // =====================================================

  const neighbourhoodLocation = getNeighbourhoodCoordinates(
    profile?.neighbourhood ?? null
  );

  const effectiveLocation =
    myLocation ?? neighbourhoodLocation;

  // Attempt GPS once when Discover is opened.
  // If permission is denied, use the saved neighbourhood.
  useEffect(() => {
    if (locationAttempted.current) return;

    locationAttempted.current = true;

    let cancelled = false;

    void getCurrentLocation()
      .then((coordinates) => {
        if (!cancelled) {
          setMyLocation(coordinates);
        }
      })
      .catch(() => {
        // GPS unavailable or denied.
        // Neighbourhood fallback is used automatically.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // LOAD CANDIDATES
  // =====================================================

  const load = useCallback(async () => {
    if (loadingMore.current) return;

    loadingMore.current = true;

    try {
      const rows = await fetchCandidates();

      setQueue((q) => {
        const have = new Set(q.map((x) => x.id));

        const fresh = rows.filter(
          (r) =>
            !have.has(r.id) &&
            !handled.current.has(r.id)
        );

        if (fresh.length === 0 && q.length === 0) {
          setExhausted(true);
        } else if (fresh.length > 0) {
          setExhausted(false);
        }

        return [...q, ...fresh];
      });

      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
      loadingMore.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // =====================================================
  // PREFETCH MORE CANDIDATES
  // =====================================================

  useEffect(() => {
    if (
      !loading &&
      queue.length > 0 &&
      queue.length < 3 &&
      !exhausted
    ) {
      void load();
    }
  }, [queue.length, loading, exhausted, load]);

  // =====================================================
  // CURRENT CANDIDATE
  // =====================================================

  const current = queue[0];

  const distanceForCurrent: CandidateWithDistance | null =
    current
      ? {
          ...current,
          distanceKm: (() => {
            if (!effectiveLocation) return null;

            const candidateLocation =
              getNeighbourhoodCoordinates(
                current.neighbourhood
              );

            if (!candidateLocation) return null;

            return getDistanceKm(
              effectiveLocation,
              candidateLocation
            );
          })(),
        }
      : null;

  // =====================================================
  // ADVANCE TO NEXT PROFILE
  // =====================================================

  const advance = () => {
    if (current) {
      handled.current.add(current.id);
    }

    setQueue((q) => q.slice(1));
  };

  // =====================================================
  // LIKE / PASS
  // =====================================================

  async function act(kind: 'like' | 'pass', comment = '') {
    if (!current || busy) return;

    setBusy(true);
    setErr(null);
    setActionNotice(null);

    try {
      if (kind === 'like') {
        const result = await likeUser(current.id, comment);

        if (result.matched && result.match_id) {
          localMatches.add(result.match_id);
          setMatched(current);
          setActionNotice(null);
        } else {
          setActionNotice(`Like sent to ${current.display_name}.`);
        }
      } else {
        await passUser(current.id);
      }

      advance();
    } catch (e) {
      const message = (e as Error).message;
      setErr(message);

      if (message.includes('no longer available')) {
        advance();
      }
    } finally {
      setBusy(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p
          className="text-center text-slate2"
          role="status"
        >
          Finding people for you…
        </p>
      </div>
    );
  }

  // =====================================================
  // MAIN DISCOVER PAGE
  // =====================================================

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">

      {/* LIKE SUCCESS FEEDBACK */}

      {actionNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="rounded-lg px-2 py-1 text-emerald-700 hover:bg-emerald-100"
            aria-label="Dismiss like confirmation"
          >
            ×
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}

      {err && (
        <div
          role="alert"
          className="
            rounded-xl
            border border-red-500/20
            bg-red-500/5
            p-3
            text-sm text-red-400
          "
        >
          {err}

          {!current && (
            <button
              className="ml-2 font-semibold underline"
              onClick={load}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* CURRENT PROFILE */}

      {current && distanceForCurrent ? (
        <>
          <ProfileCard
            key={current.id}
            c={distanceForCurrent}
            distanceKm={distanceForCurrent.distanceKm}
            busy={busy}
            onLike={(comment) => act('like', comment)}
            onPass={() => act('pass')}
          />

          <ReportBlock
            key={`rb-${current.id}`}
            uid={uid}
            targetId={current.id}
            name={current.display_name}
            onBlocked={advance}
          />
        </>
      ) : (
        !err && (
          <div
            className="
              mx-auto max-w-md
              rounded-2xl
              border border-slate-200
              bg-white
              p-8
              text-center
              shadow-sm
            "
          >
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
              <span className="text-2xl">✦</span>
            </div>

            <h1 className="text-xl font-extrabold text-slate-900">
              You're all caught up
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              There is nobody new who fits your preferences right now.
              Check back later, or widen your age range in your profile.
            </p>

            <button
              className="btn-outline mt-5"
              onClick={() => {
                setExhausted(false);
                setLoading(true);
                void load();
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span>↻</span>
                Check again
              </span>
            </button>
          </div>
        )
      )}

      {/* MATCH MODAL */}

      <Modal
        open={!!matched}
        onClose={() => setMatched(null)}
        title="It's a match"
      >
        <p>
          You and {matched?.display_name} like each other.
        </p>

        <div className="flex gap-3">
          <button
            className="btn-outline flex-1"
            onClick={() => setMatched(null)}
          >
            Keep swiping
          </button>

          <Link
            to="/matches"
            className="btn-primary flex-1 text-center"
          >
            See Liked You
          </Link>
        </div>
      </Modal>
    </div>
  );
}
