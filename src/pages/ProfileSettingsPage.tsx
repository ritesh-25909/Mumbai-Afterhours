
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';

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
  const {
    uid,
    profile,
    loading,
    error,
    reload,
  } = useMyProfile();

  // Main profile form state.
  const [b, setB] = useState<BasicsState | null>(null);

  // Profile visibility.
  const [hidden, setHidden] = useState(false);

  // Save state.
  const [busy, setBusy] = useState(false);

  // User feedback.
  const [msg, setMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // Tracks whether the user actually changed dating prompts.
  // This prevents an untouched/empty prompt state from
  // accidentally overwriting previously saved answers.
  const [promptsTouched, setPromptsTouched] = useState(false);

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
        text: 'Your saved dating prompts could not be read. Your existing database answers have been preserved.',
      });
    }

    // Convert JSONB array into the JSON string expected
    // by BasicsForm.tsx.
    const promptString = promptResult.valid
      ? JSON.stringify(promptResult.answers)
      : '';

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

      // Additional profile information.
      height: profile.height ?? '',

      occupation: profile.occupation ?? '',

      college: profile.college ?? '',

      education_status: profile.education_status ?? '',

      // Dating prompts loaded from JSONB.
      profile_prompts: promptString,
    });

  }, [profile]);

  // ====================================================
  // HANDLE FORM CHANGES
  // ====================================================

  function handleChange(patch: Partial<BasicsState>) {
    setB(previous => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        ...patch,
      };
    });

    // Mark dating prompts as intentionally modified
    // only when BasicsForm actually changes that field.
    if (
      Object.prototype.hasOwnProperty.call(
        patch,
        'profile_prompts'
      )
    ) {
      setPromptsTouched(true);
    }

    setMsg(null);
  }

  // ====================================================
  // SAVE PROFILE
  // ====================================================

  async function save() {
    if (busy) return;

    if (!uid || !profile || !b) {
      setMsg({
        ok: false,
        text: 'Your profile is not fully loaded. Please try again.',
      });

      return;
    }

    setMsg(null);

    // Keep a snapshot of the current form.
    // Never clear it when an operation fails.
    const current = b;

    // -----------------------------------------------
    // VALIDATE EXISTING PROFILE FIELDS
    // -----------------------------------------------

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
      setMsg({
        ok: false,
        text:
          result.error.issues[0]?.message ??
          'Please check your profile information.',
      });

      return;
    }

    // -----------------------------------------------
    // PREPARE DATING PROMPT ANSWERS
    // -----------------------------------------------

    const savedPromptResult = parseProfilePrompts(
      profile.profile_prompts
    );

    if (!savedPromptResult.valid) {
      setMsg({
        ok: false,
        text: 'Your existing saved dating answers could not be read. Saving has been stopped to protect your data.',
      });

      return;
    }

    let nextPrompts = savedPromptResult.answers;

    // If the user has intentionally changed prompts,
    // validate the edited JSON before sending it.
    if (promptsTouched) {
      const editedPromptResult = parseProfilePrompts(
        current.profile_prompts
      );

      if (!editedPromptResult.valid) {
        setMsg({
          ok: false,
          text: 'Your dating prompt data is invalid. Your previously saved answers have not been changed.',
        });

        return;
      }

      nextPrompts = editedPromptResult.answers;
    }

    // -----------------------------------------------
    // VALIDATE ADDITIONAL PROFILE FIELDS
    // -----------------------------------------------

    if (!current.neighbourhood.trim()) {
      setMsg({
        ok: false,
        text: 'Please enter your neighbourhood.',
      });

      return;
    }

    if (!current.height?.trim()) {
      setMsg({
        ok: false,
        text: 'Please select your height.',
      });

      return;
    }

    if (!current.occupation?.trim()) {
      setMsg({
        ok: false,
        text: 'Please enter your occupation.',
      });

      return;
    }

    if (!current.college?.trim()) {
      setMsg({
        ok: false,
        text: 'Please enter your college or university.',
      });

      return;
    }

    if (!current.education_status?.trim()) {
      setMsg({
        ok: false,
        text: 'Please select your education status.',
      });

      return;
    }

    // -----------------------------------------------
    // BUILD DATABASE PAYLOAD
    // -----------------------------------------------

    const d = result.data;

    const payload = {
      // Existing profile fields.
      display_name: d.display_name,

      gender: d.gender,

      interested_in: d.interested_in,

      neighbourhood: d.neighbourhood ?? null,

      bio: d.bio,

      languages: d.languages,

      interests: d.interests,

      relationship_intention:
        d.relationship_intention ?? null,

      visibility_status: hidden
        ? 'hidden' as const
        : 'visible' as const,

      // Additional profile fields.
      height: current.height.trim(),

      occupation: current.occupation.trim(),

      college: current.college.trim(),

      education_status:
        current.education_status.trim(),

      // JSONB array, NOT a JSON string.
      profile_prompts: nextPrompts,

    } satisfies Parameters<typeof updateProfile>[1];

    // -----------------------------------------------
    // EXECUTE SAVE
    // -----------------------------------------------

    setBusy(true);

    try {
      await updateProfile(uid, payload);

      // Read the saved record again.
      await reload();

      setMsg({
        ok: true,
        text: 'Your profile has been saved successfully.',
      });

    } catch (e) {
      console.error(
        'Profile settings save failed:',
        e
      );

      setMsg({
        ok: false,
        text:
          e instanceof Error
            ? e.message
            : 'Could not save your profile. Please try again.',
      });

      // Do not clear b.
      // Do not reset the prompt answers.
      // Do not overwrite the form after a failed save.

    } finally {
      setBusy(false);
    }
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

        <h1 className="mb-1 text-xl font-extrabold">
          Your profile
        </h1>

        <p className="mb-4 text-sm">

          <Link
            to="/settings"
            className="font-semibold text-royal"
          >
            Account and privacy settings
          </Link>

        </p>

        {/* Existing profile form. */}

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
            onChange={e => {
              setHidden(e.target.checked);
              setMsg(null);
            }}
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
        {/* SAVE MESSAGE                             */}
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
        {/* SAVE BUTTON                              */}
        {/* ======================================== */}

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy
            ? 'Saving your profile…'
            : 'Save changes'}
        </button>

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
