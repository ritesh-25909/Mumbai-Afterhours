
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { myRoles } from '../features/verification/api';
import {
  BadgeCheck,
  CheckCircle2,
  Cloud,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

import { useMyProfile } from '../features/profiles/useMyProfile';

import {
  updateProfile,
  type ProfilePromptAnswer,
} from '../features/profiles/api';

import { basicsSchema, splitList } from '../lib/validation';

import {
  BasicsForm,
  type BasicsState,
} from '../components/profile/BasicsForm';

import { PhotoSlots } from '../components/photo-upload/PhotoSlots';

// ======================================================
// PROFILE PROMPT HELPERS
// Supports Supabase JSONB arrays and legacy JSON strings.
// ======================================================

function parseProfilePrompts(value: unknown): {
  valid: boolean;
  answers: ProfilePromptAnswer[];
} {
  if (value == null || value === '') {
    return { valid: true, answers: [] };
  }

  let parsed: unknown = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { valid: false, answers: [] };
    }
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, answers: [] };
  }

  const valid = parsed.every(
    (item: unknown) =>
      typeof item === 'object' &&
      item !== null &&
      'prompt' in item &&
      'answer' in item &&
      typeof item.prompt === 'string' &&
      typeof item.answer === 'string'
  );

  if (!valid) {
    return { valid: false, answers: [] };
  }

  return {
    valid: true,
    answers: parsed as ProfilePromptAnswer[],
  };
}

// ======================================================
// MAIN PROFILE SETTINGS PAGE
// ======================================================

export default function ProfileSettingsPage() {
    const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    myRoles()
      .then((roles) => {
        if (active) {
          setIsAdmin(roles.includes('admin'));
        }
      })
      .catch((error) => {
        console.error('Admin role verification failed:', error);
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, []);
  const {
    uid,
    profile,
    loading,
    error,
    reload,
  } = useMyProfile();

  // ====================================================
  // FORM STATE
  // ====================================================

  const [b, setB] = useState<BasicsState | null>(null);

  const [hidden, setHidden] = useState(false);

  const [promptsTouched, setPromptsTouched] = useState(false);

  // ====================================================
  // AUTO-SAVE STATE
  // ====================================================

  const [busy, setBusy] = useState(false);

  const [saveStatus, setSaveStatus] = useState<
    'saved' | 'dirty' | 'saving' | 'error' | 'idle'
  >('idle');

  const [msg, setMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // Every edit increments this version.
  // This lets us detect edits made while a save is running.
  const editVersionRef = useRef(0);

  const [editVersion, setEditVersion] = useState(0);

  const savingRef = useRef(false);

  const dirtyRef = useRef(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // ====================================================
  // MARK FORM AS CHANGED
  // ====================================================

  const markDirty = useCallback(() => {
    editVersionRef.current += 1;

    dirtyRef.current = true;

    setEditVersion(editVersionRef.current);

    setSaveStatus('dirty');

    setMsg(null);
  }, []);

  // ====================================================
  // LOAD EXISTING PROFILE DATA
  // ====================================================

  useEffect(() => {
    if (!profile) {
      setB(null);
      return;
    }

    const promptResult = parseProfilePrompts(
      profile.profile_prompts
    );

    if (!promptResult.valid) {
      console.error(
        'Invalid saved profile_prompts data:',
        profile.profile_prompts
      );

      setMsg({
        ok: false,
        text:
          'Your saved dating prompts could not be read. Your existing database answers have been preserved.',
      });
    }

    const promptString = promptResult.valid
      ? JSON.stringify(promptResult.answers)
      : '';

    // A newly loaded profile is the clean baseline.
    dirtyRef.current = false;

    editVersionRef.current = 0;

    setEditVersion(0);

    setSaveStatus('saved');

    setHidden(
      profile.visibility_status === 'hidden'
    );

    setPromptsTouched(false);

    setB({
      display_name: profile.display_name ?? '',

      date_of_birth: profile.date_of_birth ?? '',

      gender: profile.gender ?? '',

      interested_in: Array.isArray(profile.interested_in)
        ? profile.interested_in
        : [],

      neighbourhood: profile.neighbourhood ?? '',

      bio: profile.bio ?? '',

      languages: Array.isArray(profile.languages)
        ? profile.languages.join(', ')
        : '',

      interests: Array.isArray(profile.interests)
        ? profile.interests.join(', ')
        : '',

      relationship_intention:
        profile.relationship_intention ?? '',

      height: profile.height ?? '',

      occupation: profile.occupation ?? '',

      college: profile.college ?? '',

      education_status: profile.education_status ?? '',

      profile_prompts: promptString,
    });
  }, [profile]);

  // ====================================================
  // HANDLE PROFILE FORM CHANGES
  // ====================================================

  function handleChange(patch: Partial<BasicsState>) {
    setB(previous => {
      if (!previous) return previous;

      return {
        ...previous,
        ...patch,
      };
    });

    if (
      Object.prototype.hasOwnProperty.call(
        patch,
        'profile_prompts'
      )
    ) {
      setPromptsTouched(true);
    }

    markDirty();
  }

  // ====================================================
  // HANDLE PROFILE VISIBILITY
  // ====================================================

  function handleVisibilityChange(value: boolean) {
    setHidden(value);
    markDirty();
  }

  // ====================================================
  // SAVE PROFILE
  // ====================================================

  const save = useCallback(async () => {
    if (savingRef.current) return;

    if (!uid || !profile || !b) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text:
          'Your profile is not fully loaded. Please try again.',
      });

      return;
    }

    if (!dirtyRef.current) return;

    // Capture the exact version being saved.
    const savingVersion = editVersionRef.current;

    // Capture a snapshot of the current form.
    const current = b;

    const currentHidden = hidden;

    const currentPromptsTouched = promptsTouched;

    setMsg(null);

    // ==================================================
    // VALIDATE EXISTING PROFILE FIELDS
    // ==================================================

    const result = basicsSchema.safeParse({
      ...current,

      neighbourhood:
        current.neighbourhood.trim() || undefined,

      languages: splitList(current.languages, 10),

      interests: splitList(current.interests),

      relationship_intention:
        current.relationship_intention || undefined,
    });

    if (!result.success) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text:
          result.error.issues[0]?.message ??
          'Please check your profile information.',
      });

      return;
    }

    // ==================================================
    // VALIDATE EXISTING SAVED PROMPTS
    // ==================================================

    const savedPromptResult = parseProfilePrompts(
      profile.profile_prompts
    );

    if (!savedPromptResult.valid) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text:
          'Your existing saved dating answers could not be read. Saving has been stopped to protect your data.',
      });

      return;
    }

    let nextPrompts = savedPromptResult.answers;

    // Only overwrite saved prompts if the user actually
    // changed the prompt field.
    if (currentPromptsTouched) {
      const editedPromptResult = parseProfilePrompts(
        current.profile_prompts
      );

      if (!editedPromptResult.valid) {
        setSaveStatus('error');

        setMsg({
          ok: false,
          text:
            'Your dating prompt data is invalid. Your previously saved answers have not been changed.',
        });

        return;
      }

      nextPrompts = editedPromptResult.answers;
    }

    // ==================================================
    // VALIDATE ADDITIONAL REQUIRED PROFILE FIELDS
    // ==================================================

    if (!current.neighbourhood.trim()) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text: 'Please enter your neighbourhood.',
      });

      return;
    }

    if (!current.height?.trim()) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text: 'Please select your height.',
      });

      return;
    }

    if (!current.occupation?.trim()) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text: 'Please enter your occupation.',
      });

      return;
    }

    if (!current.college?.trim()) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text: 'Please enter your college or university.',
      });

      return;
    }

    if (!current.education_status?.trim()) {
      setSaveStatus('error');

      setMsg({
        ok: false,
        text: 'Please select your education status.',
      });

      return;
    }

    // ==================================================
    // BUILD EXISTING DATABASE PAYLOAD
    // ==================================================

    const d = result.data;

    const payload = {
      display_name: d.display_name,

      gender: d.gender,

      interested_in: d.interested_in,

      neighbourhood: d.neighbourhood ?? null,

      bio: d.bio,

      languages: d.languages,

      interests: d.interests,

      relationship_intention:
        d.relationship_intention ?? null,

      visibility_status: currentHidden
        ? 'hidden' as const
        : 'visible' as const,

      height: current.height.trim(),

      occupation: current.occupation.trim(),

      college: current.college.trim(),

      education_status:
        current.education_status.trim(),

      // Supabase JSONB array.
      profile_prompts: nextPrompts,

    } satisfies Parameters<typeof updateProfile>[1];

    // ==================================================
    // EXECUTE SAVE
    // ==================================================

    savingRef.current = true;

    setBusy(true);

    setSaveStatus('saving');

    try {
      await updateProfile(uid, payload);

      // Only mark clean if no newer edit was made
      // while this request was running.
      if (editVersionRef.current === savingVersion) {
        dirtyRef.current = false;

        setPromptsTouched(false);

        setSaveStatus('saved');

        setMsg({
          ok: true,
          text: 'All your profile changes have been saved.',
        });
      } else {
        // Newer edits exist. Keep them pending.
        dirtyRef.current = true;

        setSaveStatus('dirty');
      }
    } catch (e) {
      console.error(
        'Profile settings save failed:',
        e
      );

      dirtyRef.current = true;

      setSaveStatus('error');

      setMsg({
        ok: false,
        text:
          e instanceof Error
            ? e.message
            : 'Could not save your profile. Please try again.',
      });
    } finally {
      savingRef.current = false;

      setBusy(false);
    }
  }, [
    uid,
    profile,
    b,
    hidden,
    promptsTouched,
  ]);

  // ====================================================
  // AUTOMATIC SAVE
  // ====================================================

  useEffect(() => {
    if (!dirtyRef.current || !b || !profile || !uid) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Wait until the user has stopped typing/changing fields.
    // Avoid saving incomplete required fields.
    const requiredFieldsComplete = Boolean(
      b.neighbourhood.trim() &&
      b.height?.trim() &&
      b.occupation?.trim() &&
      b.college?.trim() &&
      b.education_status?.trim()
    );

    if (!requiredFieldsComplete) {
      setSaveStatus('dirty');
      return;
    }

    saveTimerRef.current = setTimeout(() => {
      void save();
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    b,
    hidden,
    promptsTouched,
    profile,
    uid,
    editVersion,
    save,
  ]);

  // ====================================================
  // CLEAN UP PENDING TIMER
  // ====================================================

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // ====================================================
  // MANUAL SAVE / RETRY
  // ====================================================

  function handleManualSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    void save();
  }

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (loading) {
    return (
      <p
        className="p-5 text-slate2"
        role="status"
      >
        Loading your profile…
      </p>
    );
  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (error) {
    return (
      <div className="card space-y-3 p-5">
        <h2 className="font-bold text-bad">
          Could not load your profile
        </h2>

        <p className="text-sm text-slate2">
          {error}
        </p>

        <button
          type="button"
          className="btn-primary"
          onClick={() => void reload()}
        >
          Retry loading
        </button>
      </div>
    );
  }

  // ====================================================
  // PROFILE NOT FOUND
  // ====================================================

  if (!uid || !profile || !b) {
    return (
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">
          Profile not found
        </h2>

        <p className="text-sm text-slate2">
          Your existing profile could not be loaded.
          Your account has not been deleted.
        </p>

        <button
          type="button"
          className="btn-primary"
          onClick={() => void reload()}
        >
          Reload profile
        </button>
      </div>
    );
  }

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <div className="grid gap-6 md:grid-cols-2">

      {/* ============================================ */}
      {/* PROFILE INFORMATION                          */}
      {/* ============================================ */}

      <section className="card p-5">

        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold">
            Your profile
          </h1>

          {/* AUTO-SAVE STATUS */}

          <div
            className="flex items-center gap-1.5 text-xs font-semibold"
            role="status"
            aria-live="polite"
          >
            {saveStatus === 'saving' && (
              <>
                <Cloud className="h-4 w-4 animate-pulse text-blue-500" />
                <span className="text-blue-500">
                  Saving…
                </span>
              </>
            )}

            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600">
                  Saved
                </span>
              </>
            )}

            {saveStatus === 'dirty' && (
              <>
                <Cloud className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">
                  Unsaved changes
                </span>
              </>
            )}

            {saveStatus === 'error' && (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-500">
                  Save failed
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
  <Link
    to="/settings"
    className="text-sm font-semibold text-royal"
  >
    Account and privacy settings
  </Link>

  {isAdmin && (
    <Link
      to="/admin"
      className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-400 transition hover:border-blue-400/60 hover:bg-blue-500/20"
    >
      <ShieldCheck className="h-4 w-4" />
      Admin Panel
    </Link>
  )}
</div>

        {/* EXISTING PROFILE FORM */}

        <BasicsForm
          v={b}
          set={handleChange}
          lockDob
        />

        {/* ======================================== */}
        {/* PROFILE VISIBILITY                       */}
        {/* ======================================== */}

        <label className="mt-4 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={hidden}
            onChange={e =>
              handleVisibilityChange(e.target.checked)
            }
          />

          <span>
            <span className="font-semibold">
              Hide my profile
            </span>

            <br />

            <span className="text-sm text-slate2">
              Hidden profiles do not appear in Discover.
              People you already matched with can still
              message you.
            </span>
          </span>
        </label>

        {/* ======================================== */}
        {/* SAVE FEEDBACK                             */}
        {/* ======================================== */}

        {msg && (
          <p
            role={msg.ok ? 'status' : 'alert'}
            className={`mt-3 text-sm ${
              msg.ok ? 'text-ok' : 'text-bad'
            }`}
          >
            {msg.text}
          </p>
        )}

        {/* ======================================== */}
        {/* MANUAL SAVE / RETRY                       */}
        {/* ======================================== */}

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={busy || !dirtyRef.current}
          onClick={handleManualSave}
        >
          {busy
            ? 'Saving your profile…'
            : saveStatus === 'error'
              ? 'Retry saving'
              : 'Save changes now'}
        </button>

        <p className="mt-3 text-center text-xs text-slate2">
          Your profile automatically saves after you stop editing.
        </p>

      </section>

      {/* ============================================ */}
      {/* VERIFICATION                                */}
      {/* ============================================ */}

      <section className="card p-5 md:order-last md:col-span-2">

        <h2 className="text-xl font-extrabold">
          Verification
        </h2>

        <p className="mt-1 flex items-center gap-2 text-slate2">
          {profile.verified ? (
            <>
              <BadgeCheck className="h-5 w-5 text-royal" />
              You are verified.
            </>
          ) : (
            'Add a verified badge by submitting a selfie.'
          )}
        </p>

        <Link
          to="/verify"
          className="btn-outline mt-3"
        >
          {profile.verified
            ? 'View status'
            : 'Verify my profile'}
        </Link>

      </section>

      {/* ============================================ */}
      {/* PROFILE PHOTOS                              */}
      {/* ============================================ */}

      <section className="card p-5">

        <h2 className="mb-4 text-xl font-extrabold">
          Photos
        </h2>

        <p className="mb-3 text-slate2">
          Your published profile needs exactly three photos.
          Replace a photo to swap it.
        </p>

        <PhotoSlots uid={uid} />

      </section>

    </div>
  );
}
