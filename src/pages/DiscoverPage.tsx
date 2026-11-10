
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  MapPin,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '../features/auth/AuthProvider';
import { supabase } from '../lib/supabase';
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
  claimPendingReferral,
  getLikeCreditSummary,
  type LikeCreditSummary,
} from '../features/referrals/api';

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
  const [credits, setCredits] = useState<LikeCreditSummary | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [maxDistance, setMaxDistance] =
    useState<'any' | '10' | '25' | '50'>('any');

  const [myLocation, setMyLocation] =
    useState<Coordinates | null>(null);

  // GPS UI state
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handled = useRef(new Set<string>());
  const loadingMore = useRef(false);

  // =====================================================
  // REFERRAL CLAIM
  // =====================================================

  useEffect(() => {
    void claimPendingReferral()
      .then(result => {
        if (result.rewarded) {
          setActionNotice(
            'Referral confirmed! Your friend has joined Mumbai Afterhours.',
          );

          void getLikeCreditSummary()
            .then(setCredits)
            .catch(() => {});
        }
      })
      .catch(() => {});

    if (
      window.sessionStorage.getItem(
        'ma_referral_claim_success_v1',
      ) === '1'
    ) {
      window.sessionStorage.removeItem(
        'ma_referral_claim_success_v1',
      );

      setActionNotice(
        'Referral confirmed! Your friend has joined Mumbai Afterhours.',
      );
    }
  }, []);

  // =====================================================
  // LIKE CREDIT UPDATES
  // =====================================================

  useEffect(() => {
    let active = true;

    const refresh = () =>
      getLikeCreditSummary()
        .then(value => {
          if (active) setCredits(value);
        })
        .catch(() => {});

    void refresh();

    const channel = supabase
      .channel(`like-wallet-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'like_credit_wallets',
          filter: `user_id=eq.${uid}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [uid]);

  // =====================================================
  // LOCATION
  // GPS is preferred. Saved neighbourhood is fallback.
  // =====================================================

  const neighbourhoodLocation = getNeighbourhoodCoordinates(
    profile?.neighbourhood ?? null,
  );

  const effectiveLocation =
    myLocation ?? neighbourhoodLocation;

  /**
   * Request the user's current location.
   *
   * Uses the existing getCurrentLocation helper so the
   * project's existing Coordinates format is preserved.
   */
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError(
        'Your browser does not support GPS location services.',
      );
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const coordinates = await getCurrentLocation();

      if (!coordinates) {
        throw new Error('Location could not be detected.');
      }

      setMyLocation(coordinates);
      setLocationError(null);
    } catch (error) {
      console.error('DISCOVER GPS ERROR:', error);

      const message =
        error instanceof Error ? error.message : '';

      if (/denied|permission/i.test(message)) {
        setLocationError(
          'Location permission denied. Allow location access for this website in your browser settings, then try again.',
        );
      } else if (/timeout/i.test(message)) {
        setLocationError(
          'Location request timed out. Please try again.',
        );
      } else {
        setLocationError(
          message || 'Unable to get your location. Please try again.',
        );
      }
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Automatically attempt GPS when Discover opens.
  useEffect(() => {
    void requestLocation();
  }, [requestLocation]);

  // =====================================================
  // LOAD CANDIDATES
  // =====================================================

  const load = useCallback(async () => {
    if (loadingMore.current) return;

    loadingMore.current = true;

    try {
      const rows = await fetchCandidates();

      setQueue(q => {
        const have = new Set(q.map(x => x.id));

        const fresh = rows.filter(
          r =>
            !have.has(r.id) &&
            !handled.current.has(r.id),
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
  // DISCOVERY REFINEMENTS
  // =====================================================

  const ownInterests = (profile?.interests ?? [])
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  const candidateDistance = (
    candidate: Candidate,
  ): number | null => {
    if (!effectiveLocation) return null;

    const point = getNeighbourhoodCoordinates(
      candidate.neighbourhood,
    );

    return point
      ? getDistanceKm(effectiveLocation, point)
      : null;
  };

  const sharedFor = (candidate: Candidate) =>
    (candidate.interests ?? []).filter(value =>
      ownInterests.includes(value.trim().toLowerCase()),
    );

  const scoreFor = (candidate: Candidate) => {
    const theirs = (candidate.interests ?? []).filter(Boolean);
    const shared = sharedFor(candidate).length;

    const interestScore = theirs.length
      ? Math.round(
          (shared /
            Math.max(ownInterests.length, theirs.length, 1)) *
            65,
        )
      : 0;

    const candidateLanguages = (
      candidate.languages ?? []
    ).map(value => value.toLowerCase());

    const myLanguages = (profile?.languages ?? []).map(
      value => value.toLowerCase(),
    );

    const languageScore = candidateLanguages.some(value =>
      myLanguages.includes(value),
    )
      ? 15
      : 0;

    const intentionScore =
      candidate.relationship_intention &&
      candidate.relationship_intention ===
        profile?.relationship_intention
        ? 20
        : 0;

    return Math.min(
      99,
      interestScore + languageScore + intentionScore,
    );
  };

  const visibleQueue = queue
    .filter(candidate => !verifiedOnly || candidate.verified)
    .filter(
      candidate =>
        !sharedOnly || sharedFor(candidate).length > 0,
    )
    .filter(candidate => {
      if (maxDistance === 'any') return true;

      const distance = candidateDistance(candidate);

      return (
        distance !== null &&
        distance <= Number(maxDistance)
      );
    })
    .sort((a, b) => scoreFor(b) - scoreFor(a));

  const current = visibleQueue[0];

  const distanceForCurrent: CandidateWithDistance | null =
    current
      ? {
          ...current,
          distanceKm: candidateDistance(current),
        }
      : null;

  // =====================================================
  // ADVANCE TO NEXT PROFILE
  // =====================================================

  const advance = () => {
    if (current) {
      handled.current.add(current.id);

      setQueue(q =>
        q.filter(item => item.id !== current.id),
      );
    }
  };

  // =====================================================
  // LIKE / PASS
  // =====================================================

  async function act(
    kind: 'like' | 'pass',
    comment = '',
  ) {
    if (!current || busy) return;

    if (
      kind === 'like' &&
      credits &&
      credits.daily_free_remaining === 0 &&
      credits.referral_bonus_credits === 0
    ) {
      setErr(
        'You have used all 15 daily likes and have no referral bonus credits left. Visit Settings → Mumbai Afterhours referrals to earn 10 bonus likes when a friend joins.',
      );
      return;
    }

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
          setActionNotice(
            `Like sent to ${current.display_name}.`,
          );
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

      {/* DISCOVER NEARBY / GPS */}

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <MapPin className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="font-bold text-slate-900">
                Discover nearby
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {myLocation
                  ? 'GPS location enabled. Distances are approximate.'
                  : neighbourhoodLocation
                    ? 'Using your saved neighbourhood. Enable GPS for a more accurate location.'
                    : 'Enable GPS to see approximate distances.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void requestLocation()}
            disabled={locationLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locationLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Locating…
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                {myLocation ? 'Refresh GPS' : 'Enable GPS'}
              </>
            )}
          </button>
        </div>

        {locationError && (
          <div
            className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3"
            role="alert"
          >
            <p className="text-sm leading-6 text-red-700">
              {locationError}
            </p>

            {/denied|permission/i.test(locationError) && (
              <p className="mt-2 text-xs leading-5 text-red-600">
                Open your browser's site settings, change Location
                permission to Allow, refresh this page, and try again.
              </p>
            )}
          </div>
        )}

        {myLocation && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <BadgeCheck className="h-4 w-4" />
            Your device location is active.
          </p>
        )}
      </section>

      {/* DISCOVER REFINEMENTS */}

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() =>
            setFiltersOpen(value => !value)
          }
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <SlidersHorizontal className="h-4 w-4 text-blue-700" />
            Refine your Discover
          </span>

          <span className="text-xs font-semibold text-blue-700">
            {filtersOpen ? 'Hide filters' : 'Filters'}
          </span>
        </button>

        {filtersOpen && (
          <div className="space-y-3 border-t border-slate-100 px-4 py-4">
            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              <span className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-blue-600" />
                Verified profiles only
              </span>

              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={event =>
                  setVerifiedOnly(event.target.checked)
                }
                className="h-4 w-4 accent-blue-600"
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                People sharing my interests
              </span>

              <input
                type="checkbox"
                checked={sharedOnly}
                onChange={event =>
                  setSharedOnly(event.target.checked)
                }
                className="h-4 w-4 accent-blue-600"
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              <span>Approximate distance</span>

              <select
                value={maxDistance}
                onChange={event =>
                  setMaxDistance(
                    event.target.value as typeof maxDistance,
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="any">Any distance</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="50">Within 50 km</option>
              </select>
            </label>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                Filters apply to loaded profiles only. Your saved
                preferences remain unchanged.
              </span>

              <button
                type="button"
                onClick={() => {
                  setVerifiedOnly(false);
                  setSharedOnly(false);
                  setMaxDistance('any');
                }}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-700"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>
        )}
      </section>

      {/* LIKE CREDIT BALANCES */}

      {credits && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="font-semibold text-slate-800">
              ♥ Likes left today:{' '}
              <strong className="text-blue-700">
                {credits.daily_free_remaining}/15
              </strong>
            </span>

            <span className="font-semibold text-slate-800">
              Bonus credits:{' '}
              <strong className="text-emerald-700">
                {credits.referral_bonus_credits}
              </strong>
            </span>
          </div>

          <Link
            to="/settings/referrals"
            className="text-sm font-bold text-blue-700 hover:underline"
          >
            Earn bonus likes
          </Link>
        </div>
      )}

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
          className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400"
        >
          {err}

          {err.includes('15 daily likes') && (
            <Link
              to="/settings/referrals"
              className="ml-2 font-bold underline"
            >
              View referral rewards
            </Link>
          )}

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
            compatibilityScore={scoreFor(current)}
            sharedInterests={sharedFor(current)}
            dailyPick={
              visibleQueue[0]?.id === current.id &&
              visibleQueue.length > 1 &&
              scoreFor(current) >= 45
            }
            busy={busy}
            likeDisabled={
              !!credits &&
              credits.daily_free_remaining === 0 &&
              credits.referral_bonus_credits === 0
            }
            onLike={comment => act('like', comment)}
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
        !err &&
        (queue.length > 0 &&
        (verifiedOnly || sharedOnly || maxDistance !== 'any') ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-7 text-center shadow-sm">
            <Sparkles className="mx-auto h-8 w-8 text-blue-600" />

            <h2 className="mt-3 font-bold text-slate-900">
              No profiles match these filters
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Try widening your distance or turning off a filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setVerifiedOnly(false);
                setSharedOnly(false);
                setMaxDistance('any');
              }}
              className="btn-primary mt-4"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
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
        ))
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
