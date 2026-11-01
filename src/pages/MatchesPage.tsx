
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, X, BadgeCheck, MessageCircle } from 'lucide-react';
import {
  listIncomingLikes,
  likeBack,
  passIncomingLike,
  type IncomingLike
} from '../features/matches/api';
import { listMatches } from '../features/matches/api';
import { Modal } from '../components/ui/Modal';

export default function MatchesPage() {
  const [items, setItems] = useState<IncomingLike[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [matched, setMatched] = useState<{
    name: string;
    conversationId: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      setItems(await listIncomingLikes());
    } catch (e) {
      setErr((e as Error).message);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(user: IncomingLike, action: 'like' | 'pass') {
    if (busyId) return;

    setBusyId(user.user_id);
    setErr(null);

    try {
      if (action === 'like') {
        const result = await likeBack(user.user_id);

        if (result.matched) {
          const matches = await listMatches();
          const match = matches.find(m => m.user_id === user.user_id);

          setMatched({
            name: user.display_name,
            conversationId: match?.conversation_id ?? null
          });
        }
      } else {
        await passIncomingLike(user.user_id);
      }

      setItems(current =>
        current?.filter(item => item.user_id !== user.user_id) ?? []
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (!items) {
    return <p className="text-slate2" role="status">Loading likes…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Liked You</h1>

      <p className="text-sm text-slate2">
        These people liked your profile. Like them back to make a match!
      </p>

      {err && (
        <p role="alert" className="text-bad">
          {err}
          <button className="ml-2 underline" onClick={load}>
            Retry
          </button>
        </p>
      )}

      {items.length === 0 && !err ? (
        <div className="card p-8 text-center">
          <Heart className="mx-auto h-10 w-10 text-royal" />
          <p className="mt-3 font-bold">No likes yet</p>
          <p className="mt-1 text-slate2">
            When someone likes your profile, you'll find them here.
          </p>
          <Link to="/discover" className="btn-primary mt-4 inline-block">
            Go to Discover
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map(user => (
            <li key={user.user_id} className="card overflow-hidden">
              <div className="relative aspect-[3/4] bg-mist">
                {user.photoUrl && (
                  <img
                    src={user.photoUrl}
                    alt={user.display_name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-royal px-3 py-1 text-sm font-bold text-white">
                  Likes you
                </span>
              </div>

              <div className="space-y-3 p-3">
                <p className="flex items-center gap-1 font-extrabold">
                  {user.display_name}, {user.age}
                  {user.verified && (
                    <BadgeCheck className="h-5 w-5 text-royal" />
                  )}
                </p>

                <p className="text-sm text-slate2">
                  Liked {new Date(user.liked_at).toLocaleDateString('en-IN')}
                </p>

                <button
                  disabled={busyId !== null}
                  onClick={() => handleAction(user, 'like')}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-2 disabled:opacity-50"
                >
                  <Heart className="h-5 w-5" />
                  {busyId === user.user_id ? 'Processing…' : 'Like Back'}
                </button>

                <button
                  disabled={busyId !== null}
                  onClick={() => handleAction(user, 'pass')}
                  className="btn-outline flex w-full items-center justify-center gap-2 py-2 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                  Pass
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!matched}
        onClose={() => setMatched(null)}
        title="It's a match! ❤️"
      >
        <p>
          You and {matched?.name} like each other. Your conversation is ready!
        </p>

        <div className="mt-4 flex gap-3">
          <button
            className="btn-outline flex-1"
            onClick={() => setMatched(null)}
          >
            Continue
          </button>

          {matched?.conversationId && (
            <Link
              to={`/chat/${matched.conversationId}`}
              className="btn-primary flex flex-1 items-center justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              Message
            </Link>
          )}
        </div>
      </Modal>
    </div>
  );
}
