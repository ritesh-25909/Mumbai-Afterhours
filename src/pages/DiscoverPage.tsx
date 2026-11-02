
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';

import { useAuth } from '../features/auth/AuthProvider';
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

  const [queue, setQueue] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [matched, setMatched] = useState<Candidate | null>(null);

  const [myLocation, setMyLocation] =
    useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handled = useRef(new Set<string>());
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    if (loadingMore.current) return;

    loadingMore.current = true;

    try {
      const rows = await fetchCandidates();

      setQueue(q => {
        const have = new Set(q.map(x => x.id));

        const fresh = rows.filter(
          r => !have.has(r.id) && !handled.current.has(r.id)
        );

        if (fresh.length === 0 && q.length === 0) {
          setExhausted(true);
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
    load();
  }, [load]);

  useEffect(() => {
    if (
      !loading &&
      queue.length > 0 &&
      queue.length < 3 &&
      !exhausted
    ) {
      load();
    }
  }, [queue.length, loading, exhausted, load]);

  const requestLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const coordinates = await getCurrentLocation();
      setMyLocation(coordinates);
    } catch (e) {
      setLocationError((e as Error).message);
      setMyLocation(null);
    } finally {
      setLocationLoading(false);
    }
  };

  const current = queue[0];

  const distanceForCurrent: CandidateWithDistance | null =
    current
      ? {
          ...current,
          distanceKm: (() => {
            if (!myLocation) return null;

            const profileLocation =
              getNeighbourhoodCoordinates(current.neighbourhood);

            if (!profileLocation) return null;

            return getDistanceKm(myLocation, profileLocation);
          })(),
        }
      : null;

  const advance = () => {
    if (current) handled.current.add(current.id);
    setQueue(q => q.slice(1));
  };

  async function act(kind: 'like' | 'pass') {
    if (!current || busy) return;

    setBusy(true);
    setErr(null);

    try {
      if (kind === 'like') {
        const r = await likeUser(current.id);

        if (r.matched && r.match_id) {
          localMatches.add(r.match_id);
          setMatched(current);
        }
      } else {
        await passUser(current.id);
      }

      advance();
    } catch (e) {
      const m = (e as Error).message;
      setErr(m);

      if (m.includes('no longer available')) {
        advance();
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-center text-slate2" role="status">
        Finding people for you…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* LOCATION CONTROL */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-royal/10 text-royal">
            <MapPin className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="font-bold text-ink">
              {myLocation ? 'Location enabled' : 'Discover nearby'}
            </p>

            <p className="text-xs text-slate2">
              {myLocation
                ? 'Showing approximate neighbourhood distances'
                : 'Enable GPS to see approximate distances'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={requestLocation}
          disabled={locationLoading}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-royal px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {locationLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}

          {locationLoading
            ? 'Locating'
            : myLocation
              ? 'Refresh'
              : 'Use my location'}
        </button>
      </div>

      {locationError && (
        <p
          role="status"
          className="mx-auto max-w-md rounded-xl border border-line bg-white p-3 text-sm text-slate2"
        >
          {locationError}
        </p>
      )}

      {err && (
        <p
          role="alert"
          className="mx-auto max-w-md rounded-lg border border-bad/30 bg-white p-3 text-bad"
        >
          {err}

          {!current && (
            <button className="ml-2 underline" onClick={load}>
              Retry
            </button>
          )}
        </p>
      )}

      {current && distanceForCurrent ? (
        <>
          <ProfileCard
            key={current.id}
            c={distanceForCurrent}
            distanceKm={distanceForCurrent.distanceKm}
            busy={busy}
            onLike={() => act('like')}
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
          <div className="card mx-auto max-w-md p-8 text-center">
            <h1 className="text-xl font-extrabold">
              You're all caught up
            </h1>

            <p className="mt-2 text-slate2">
              There is nobody new who fits your preferences right now.
              Check back later, or widen your age range in your profile.
            </p>

            <button
              className="btn-outline mt-4"
              onClick={() => {
                setExhausted(false);
                setLoading(true);
                load();
              }}
            >
              Check again
            </button>
          </div>
        )
      )}

      <Modal
        open={!!matched}
        onClose={() => setMatched(null)}
        title="It's a match"
      >
        <p>You and {matched?.display_name} like each other.</p>

        <div className="flex gap-3">
          <button
            className="btn-outline flex-1"
            onClick={() => setMatched(null)}
          >
            Keep swiping
          </button>

          <Link to="/matches" className="btn-primary flex-1">
            See Liked You
          </Link>
        </div>
      </Modal>
    </div>
  );
}
