
import { useEffect, useState } from 'react';

import { useMyProfile } from '../features/profiles/useMyProfile';

import {
  getPrefs,
  savePrefs,
  type Profile,
} from '../features/profiles/api';

import {
  listBlocks,
  unblock,
} from '../features/safety/api';

import {
  getChatPrivacySettings,
  saveChatPrivacySettings,
  type ChatPrivacySettings,
  DEFAULT_CHAT_PRIVACY,
} from '../features/messaging/api';

import { prefsSchema } from '../lib/validation';

import { SettingsNav } from '../components/settings/SettingsNav';

type PageMessage = {
  ok: boolean;
  text: string;
};

export default function PrivacySettingsPage() {
  const {
    uid,
    profile,
    loading,
    error,
    reload,
  } = useMyProfile();

  const [hidden, setHidden] = useState(false);
  const [showHood, setShowHood] = useState(true);

  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(45);
  const [pg, setPg] = useState<string[]>([]);

  const [blocks, setBlocks] = useState<any[]>([]);

  const [chatPrivacy, setChatPrivacy] =
    useState<ChatPrivacySettings>(DEFAULT_CHAT_PRIVACY);

  const [msg, setMsg] = useState<PageMessage | null>(null);
  const [chatMsg, setChatMsg] = useState<PageMessage | null>(null);

  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  /* ================================================
     LOAD PROFILE AND PRIVACY SETTINGS
  ================================================ */

  useEffect(() => {
    if (!uid || !profile) return;

    setHidden(profile.visibility_status === 'hidden');

    setShowHood(
      (profile as Profile & { show_neighbourhood?: boolean })
        .show_neighbourhood ?? true
    );

    getPrefs(uid)
      .then((p) => {
        if (!p) return;

        setMinAge(p.minimum_age ?? 18);
        setMaxAge(p.maximum_age ?? 45);
        setPg(p.preferred_gender ?? []);
      })
      .catch((e: unknown) => {
        setMsg({
          ok: false,
          text: (e as Error).message,
        });
      });

    listBlocks()
      .then(setBlocks)
      .catch((e: unknown) => {
        console.error('Could not load blocked users:', e);
      });

    getChatPrivacySettings()
      .then(setChatPrivacy)
      .catch((e: unknown) => {
        setChatMsg({
          ok: false,
          text: (e as Error).message,
        });
      });
  }, [uid, profile]);

  /* ================================================
     SAVE EXISTING PROFILE PRIVACY
  ================================================ */

  async function save() {
    if (busy || !uid) return;

    const validation = prefsSchema.safeParse({
      minimum_age: minAge,
      maximum_age: maxAge,
    });

    if (!validation.success) {
      setMsg({
        ok: false,
        text: validation.error.issues[0]?.message ??
          'Please check your age preferences.',
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      // Preserve the existing profile visibility behaviour.
      // Do not modify unrelated profile fields.
      const { error: profileError } = await (
        await import('../lib/supabase')
      ).supabase
        .from('profiles')
        .update({
          visibility_status: hidden ? 'hidden' : 'visible',
        })
        .eq('id', uid);

      if (profileError) throw profileError;

      await savePrefs(uid, {
        minimum_age: minAge,
        maximum_age: maxAge,
        preferred_gender: pg,
      });

      setMsg({
        ok: true,
        text: 'Your privacy preferences have been saved.',
      });

      await reload();
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  /* ================================================
     SAVE CHAT PRIVACY SETTINGS
  ================================================ */

  async function updateChatPrivacy(
    key: keyof ChatPrivacySettings,
    value: boolean
  ) {
    const previous = chatPrivacy;

    const updated = {
      ...previous,
      [key]: value,
    };

    setChatPrivacy(updated);
    setChatBusy(true);
    setChatMsg(null);

    try {
      await saveChatPrivacySettings(updated);

      window.dispatchEvent(
        new Event('chat-privacy-updated')
      );

      setChatMsg({
        ok: true,
        text: 'Chat privacy settings saved.',
      });
    } catch (e) {
      setChatPrivacy(previous);

      setChatMsg({
        ok: false,
        text: (e as Error).message,
      });
    } finally {
      setChatBusy(false);
    }
  }

  /* ================================================
     UNBLOCK USER
  ================================================ */

  async function doUnblock(userId: string) {
    try {
      await unblock(userId);

      setBlocks((current) =>
        current.filter((item) =>
          item.blocked_id !== userId &&
          item.blocked_user_id !== userId &&
          item.id !== userId
        )
      );

      setMsg({
        ok: true,
        text: 'User unblocked successfully.',
      });
    } catch (e) {
      setMsg({
        ok: false,
        text: (e as Error).message,
      });
    }
  }

  /* ================================================
     LOADING
  ================================================ */

  if (loading) {
    return (
      <p className="p-6 text-slate2" role="status">
        Loading privacy settings…
      </p>
    );
  }

  if (error) {
    return (
      <div className="card space-y-3 p-5">
        <p className="text-bad">{error}</p>

        <button
          className="btn-primary"
          onClick={() => void reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!uid || !profile) return null;

  /* ================================================
     MAIN UI
  ================================================ */

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">

      <SettingsNav />

      <header>
        <h1 className="text-2xl font-extrabold">
          Privacy Settings
        </h1>

        <p className="mt-1 text-sm text-slate2">
          Manage your profile visibility and chat privacy.
        </p>
      </header>

      {/* PROFILE VISIBILITY */}

      <section className="card space-y-5 p-5">

        <div>
          <h2 className="text-lg font-extrabold">
            Profile Visibility
          </h2>

          <p className="mt-1 text-sm text-slate2">
            Control how other people discover your profile.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
          />

          <span>
            <span className="font-semibold">
              Hide my profile
            </span>

            <span className="mt-1 block text-sm text-slate2">
              Hidden profiles do not appear in Discover.
              Existing matches can still message you.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={showHood}
            onChange={(e) => setShowHood(e.target.checked)}
          />

          <span>
            <span className="font-semibold">
              Show my neighbourhood
            </span>

            <span className="mt-1 block text-sm text-slate2">
              Allow people to see your neighbourhood on your profile.
            </span>
          </span>
        </label>

      </section>

      {/* DISCOVERY PREFERENCES */}

      <section className="card space-y-5 p-5">

        <div>
          <h2 className="text-lg font-extrabold">
            Who I See
          </h2>

          <p className="mt-1 text-sm text-slate2">
            Manage your discovery age preferences.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">

          <label>
            <span className="mb-1 block text-sm font-semibold">
              Minimum age
            </span>

            <input
              className="field"
              type="number"
              min={18}
              max={99}
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold">
              Maximum age
            </span>

            <input
              className="field"
              type="number"
              min={18}
              max={99}
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
            />
          </label>

        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">
            Preferred gender
          </p>

          <div className="flex flex-wrap gap-2">
            {['Man', 'Woman', 'Non-binary'].map((gender) => {
              const selected = pg.includes(gender);

              return (
                <button
                  key={gender}
                  type="button"
                  onClick={() =>
                    setPg((current) =>
                      selected
                        ? current.filter((x) => x !== gender)
                        : [...current, gender]
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? 'border-royal bg-royal text-white'
                      : 'border-line bg-white text-ink hover:border-royal'
                  }`}
                >
                  {gender}
                </button>
              );
            })}
          </div>
        </div>

      </section>

      {/* CHAT PRIVACY */}

      <section className="card space-y-5 p-5">

        <div>
          <h2 className="text-lg font-extrabold">
            Chat Privacy
          </h2>

          <p className="mt-1 text-sm text-slate2">
            Choose what other people can see when you chat.
          </p>
        </div>

        {/* READ RECEIPTS */}

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0">
            <h3 className="font-semibold">
              Read Receipts
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate2">
              When enabled, people can see the emerald-green
              double tick when you read their messages.
            </p>

            <p className="mt-1 text-xs text-slate2">
              Turning this off also hides other people's read receipts from you.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={chatPrivacy.read_receipts_enabled}
            disabled={chatBusy}
            onClick={() =>
              void updateChatPrivacy(
                'read_receipts_enabled',
                !chatPrivacy.read_receipts_enabled
              )
            }
            className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
              chatPrivacy.read_receipts_enabled
                ? 'bg-emerald-500'
                : 'bg-slate-300'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                chatPrivacy.read_receipts_enabled
                  ? 'left-6'
                  : 'left-1'
              }`}
            />
          </button>

        </div>

        <div className="border-t border-line" />

        {/* ACTIVITY STATUS */}

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0">
            <h3 className="font-semibold">
              Activity Status
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate2">
              Allow people to see when you are online or
              when you were last active.
            </p>

            <p className="mt-1 text-xs text-slate2">
              Turning this off also hides other people's activity status from you.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={chatPrivacy.activity_status_enabled}
            disabled={chatBusy}
            onClick={() =>
              void updateChatPrivacy(
                'activity_status_enabled',
                !chatPrivacy.activity_status_enabled
              )
            }
            className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
              chatPrivacy.activity_status_enabled
                ? 'bg-emerald-500'
                : 'bg-slate-300'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                chatPrivacy.activity_status_enabled
                  ? 'left-6'
                  : 'left-1'
              }`}
            />
          </button>

        </div>

        {chatMsg && (
          <p
            role={chatMsg.ok ? 'status' : 'alert'}
            className={`text-sm ${
              chatMsg.ok ? 'text-ok' : 'text-bad'
            }`}
          >
            {chatMsg.text}
          </p>
        )}

      </section>

      {/* NOTIFICATIONS */}

      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-extrabold">
          Notifications
        </h2>

        <p className="text-sm text-slate2">
          Email and push notification preferences will be available here.
        </p>
      </section>

      {/* BLOCKED PEOPLE */}

      <section className="card space-y-4 p-5">

        <div>
          <h2 className="text-lg font-extrabold">
            Blocked People
          </h2>

          <p className="mt-1 text-sm text-slate2">
            Manage people you have blocked.
          </p>
        </div>

        {blocks.length === 0 ? (
          <p className="text-sm text-slate2">
            You have not blocked anyone.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {blocks.map((item, index) => {
              const blockedId =
                item.blocked_id ??
                item.blocked_user_id ??
                item.id;

              const name =
                item.display_name ??
                item.blocked_profile?.display_name ??
                'Blocked user';

              return (
                <div
                  key={blockedId ?? index}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="font-semibold">
                    {name}
                  </span>

                  <button
                    type="button"
                    className="btn-outline text-sm"
                    onClick={() => void doUnblock(blockedId)}
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* SAVE EXISTING PREFERENCES */}

      {msg && (
        <p
          role={msg.ok ? 'status' : 'alert'}
          className={`text-sm ${
            msg.ok ? 'text-ok' : 'text-bad'
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="button"
        className="btn-primary w-full"
        disabled={busy}
        onClick={() => void save()}
      >
        {busy ? 'Saving…' : 'Save Changes'}
      </button>

    </div>
  );
}
