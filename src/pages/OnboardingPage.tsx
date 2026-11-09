
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  GraduationCap,
  Ruler,
  BriefcaseBusiness,
} from 'lucide-react';

import { useMyProfile } from '../features/profiles/useMyProfile';
import {
  createProfile,
  updateProfile,
  getPrefs,
  savePrefs,
  publishProfile,
} from '../features/profiles/api';
import { listMyPhotos, type Photo } from '../features/photos/api';
import { basicsSchema, prefsSchema, splitList } from '../lib/validation';
import {
  BasicsForm,
  type BasicsState,
  type ProfilePromptAnswer,
} from '../components/profile/BasicsForm';
import { ProfilePreview } from '../components/profile/ProfilePreview';
import { PhotoSlots } from '../components/photo-upload/PhotoSlots';
import { Logo } from '../components/ui/Logo';
import { claimPendingReferral } from '../features/referrals/api';

const STEPS = ['About you', 'Preferences', 'Photos', 'Preview'];
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 6;
const MIN_COMPLETED_PROMPTS = 2;

const empty: BasicsState = {
  display_name: '',
  date_of_birth: '',
  gender: '',
  interested_in: [],
  neighbourhood: '',
  bio: '',
  languages: '',
  interests: '',
  relationship_intention: '',
  height: '',
  occupation: '',
  college: '',
  education_status: '',
  profile_prompts: '[]',

  // New profile fields
  smoking: '',
  alcohol: '',
  religion: '',
};

/**
 * Converts profile_prompts into the array format expected by Supabase.
 */
function readPromptAnswers(value: unknown): ProfilePromptAnswer[] {
  let parsed: unknown = value;

  if (typeof value === 'string') {
    if (!value.trim()) return [];

    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (item): item is ProfilePromptAnswer =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.prompt === 'string' &&
      typeof item.answer === 'string',
  );
}

function completedPromptAnswers(value?: string): ProfilePromptAnswer[] {
  return readPromptAnswers(value).filter(
    item =>
      item.prompt.trim().length > 0 &&
      item.answer.trim().length > 0,
  );
}

export default function OnboardingPage() {
  const {
    uid,
    profile,
    loading,
    error: loadErr,
    reload,
  } = useMyProfile();

  const nav = useNavigate();

  const [step, setStep] = useState(0);
  const [b, setB] = useState<BasicsState>(empty);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(45);
  const [photoCount, setPhotoCount] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load existing profile information into onboarding.
  useEffect(() => {
    if (!profile || !uid) return;

    setB({
      display_name: profile.display_name,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
      interested_in: profile.interested_in,
      neighbourhood: profile.neighbourhood ?? '',
      bio: profile.bio ?? '',
      languages: (profile.languages ?? []).join(', '),
      interests: (profile.interests ?? []).join(', '),
      relationship_intention: profile.relationship_intention ?? '',

      height: profile.height ?? '',
      occupation: profile.occupation ?? '',
      college: profile.college ?? '',
      education_status: profile.education_status ?? '',

      profile_prompts: JSON.stringify(
        readPromptAnswers(profile.profile_prompts),
      ),

      // Restore saved selections
      smoking: profile.smoking ?? '',
      alcohol: profile.alcohol ?? '',
      religion: profile.religion ?? '',
    });

    getPrefs(uid)
      .then(p => {
        if (p) {
          setMinAge(p.minimum_age);
          setMaxAge(p.maximum_age);
        }
      })
      .catch(e => setErr((e as Error).message));

    listMyPhotos(uid)
      .then(items => {
        setPhotos(items.slice(0, MAX_PHOTOS));
        setPhotoCount(items.length);
      })
      .catch(() => {
        // PhotoSlots displays its own gallery load error.
      });
  }, [profile, uid]);

  if (loading) {
    return (
      <p className="p-8 text-slate2" role="status">
        Loading…
      </p>
    );
  }

  if (loadErr) {
    return (
      <p className="p-8 text-bad" role="alert">
        {loadErr}{' '}
        <button className="underline" onClick={reload}>
          Retry
        </button>
      </p>
    );
  }

  if (profile?.profile_complete) {
    return <Navigate to="/discover" replace />;
  }

  if (!uid) return null;

  const userId = uid;

  function parsedBasics() {
    return basicsSchema.safeParse({
      ...b,
      neighbourhood: b.neighbourhood || undefined,
      languages: splitList(b.languages, 10),
      interests: splitList(b.interests),
      relationship_intention: b.relationship_intention || undefined,
    });
  }

  function validateRequiredPrompts() {
    const completed = completedPromptAnswers(b.profile_prompts);

    if (completed.length < MIN_COMPLETED_PROMPTS) {
      return `Choose and answer at least ${MIN_COMPLETED_PROMPTS} different profile prompts.`;
    }

    return null;
  }

  async function next() {
    setErr(null);
    setBusy(true);

    try {
      if (step === 0) {
        const r = parsedBasics();

        if (!r.success) {
          setErr(r.error.issues[0].message);
          return;
        }

        const promptError = validateRequiredPrompts();

        if (promptError) {
          setErr(promptError);
          return;
        }

        const d = r.data;

        const promptAnswers = readPromptAnswers(b.profile_prompts);

        const payload: Parameters<typeof createProfile>[2] = {
          display_name: d.display_name,
          gender: d.gender,
          interested_in: d.interested_in,
          neighbourhood: d.neighbourhood ?? null,
          bio: d.bio,
          languages: d.languages,
          interests: d.interests,
          relationship_intention: d.relationship_intention ?? null,

          height: b.height?.trim() || null,
          occupation: b.occupation?.trim() || null,
          college: b.college?.trim() || null,
          education_status: b.education_status?.trim() || null,

          profile_prompts: promptAnswers,

          // Save the new fields
          smoking: b.smoking?.trim() || null,
          alcohol: b.alcohol?.trim() || null,
          religion: b.religion?.trim() || null,
        };

        if (profile) {
          await updateProfile(userId, payload);
        } else {
          await createProfile(
            userId,
            d.date_of_birth,
            payload,
          );
          // Claim only after a brand-new profile has been created.
          try { await claimPendingReferral(); } catch (referralError) { console.warn('Referral claim could not be completed:', referralError); }
        }

        await reload();
      } else if (step === 1) {
        const r = prefsSchema.safeParse({
          minimum_age: minAge,
          maximum_age: maxAge,
        });

        if (!r.success) {
          setErr(r.error.issues[0].message);
          return;
        }

        await savePrefs(userId, {
          minimum_age: minAge,
          maximum_age: maxAge,
          preferred_gender: b.interested_in,
        });
      } else if (step === 2) {
        const currentPhotos = await listMyPhotos(userId);

        if (currentPhotos.length < MIN_PHOTOS) {
          setErr(`Add at least ${MIN_PHOTOS} photos to continue.`);
          return;
        }

        if (currentPhotos.length > MAX_PHOTOS) {
          setErr(`You can upload a maximum of ${MAX_PHOTOS} photos.`);
          return;
        }

        setPhotos(currentPhotos.slice(0, MAX_PHOTOS));
        setPhotoCount(currentPhotos.length);
      }

      setStep(current => Math.min(current + 1, STEPS.length - 1));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setErr(null);

    const promptError = validateRequiredPrompts();

    if (promptError) {
      setErr(promptError);
      setStep(0);
      return;
    }

    try {
      setBusy(true);

      const latestPhotos = await listMyPhotos(userId);

      if (latestPhotos.length < MIN_PHOTOS) {
        setErr(`Add at least ${MIN_PHOTOS} photos before publishing.`);
        setStep(2);
        return;
      }

      if (latestPhotos.length > MAX_PHOTOS) {
        setErr(`You can upload a maximum of ${MAX_PHOTOS} photos.`);
        setStep(2);
        return;
      }

      setPhotos(latestPhotos.slice(0, MAX_PHOTOS));

      await publishProfile();

      nav('/discover', { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const visiblePromptAnswers = completedPromptAnswers(b.profile_prompts);

  const heightOccupationCollege = [
    b.height?.trim()
      ? { label: 'Height', value: b.height.trim(), icon: 'height' }
      : null,

    b.occupation?.trim()
      ? { label: 'Occupation', value: b.occupation.trim(), icon: 'work' }
      : null,

    b.college?.trim()
      ? { label: 'College / University', value: b.college.trim(), icon: 'college' }
      : null,

    b.education_status?.trim()
      ? { label: 'Education', value: b.education_status.trim(), icon: 'education' }
      : null,
  ].filter(
    (item): item is {
      label: string;
      value: string;
      icon: string;
    } => item !== null,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ink px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <Logo />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="font-semibold text-slate2" aria-live="polite">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>

          <span className="text-xs font-semibold text-slate2">
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </span>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(((step + 1) / STEPS.length) * 100)}
        >
          <div
            className="h-full rounded-full bg-royal transition-all duration-300"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>

        <div className="card mt-5 p-4 sm:p-6">
          {step === 0 && (
            <BasicsForm
              v={b}
              set={patch =>
                setB(current => ({
                  ...current,
                  ...patch,
                }))
              }
              lockDob={!!profile}
            />
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-extrabold">
                  Who would you like to see?
                </h1>

                <p className="mt-1 text-sm leading-6 text-slate2">
                  These preferences stay private. Only you can see them.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-semibold">
                    Minimum age
                  </span>

                  <input
                    className="field"
                    type="number"
                    min={18}
                    max={99}
                    value={minAge}
                    onChange={e => setMinAge(Number(e.target.value))}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-semibold">
                    Maximum age
                  </span>

                  <input
                    className="field"
                    type="number"
                    min={18}
                    max={99}
                    value={maxAge}
                    onChange={e => setMaxAge(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">
                  Add your photos
                </h1>

                <p className="mt-1 text-sm leading-6 text-slate2">
                  Add at least {MIN_PHOTOS} and up to {MAX_PHOTOS} clear
                  photos of you. Your first photo is your main profile photo.
                  Only use photos you have permission to share.
                </p>
              </div>

              <PhotoSlots
                uid={userId}
                onChange={count =>
                  setPhotoCount(Math.min(count, MAX_PHOTOS))
                }
              />

              <p className="text-sm text-slate2">
                {Math.min(photoCount, MAX_PHOTOS)} of {MAX_PHOTOS} photos
                added.

                {photoCount < MIN_PHOTOS
                  ? ` Add ${MIN_PHOTOS - photoCount} more to continue.`
                  : ' You can continue when ready.'}
              </p>
            </div>
          )}

          {step === 3 && parsedBasics().success && (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <ProfilePreview
                  name={b.display_name}
                  dob={b.date_of_birth}
                  neighbourhood={b.neighbourhood}
                  bio={b.bio}
                  interests={splitList(b.interests)}
                  intention={b.relationship_intention}
                  photos={photos.slice(0, MAX_PHOTOS)}
                />
              </div>

              {heightOccupationCollege.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-royal" />

                    <h2 className="font-extrabold text-slate-900">
                      More about you
                    </h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {heightOccupationCollege.map(item => (
                      <div
                        key={item.label}
                        className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3"
                      >
                        <span className="mt-0.5 text-royal">
                          {item.icon === 'height' ? (
                            <Ruler className="h-5 w-5" />
                          ) : item.icon === 'work' ? (
                            <BriefcaseBusiness className="h-5 w-5" />
                          ) : (
                            <GraduationCap className="h-5 w-5" />
                          )}
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate2">
                            {item.label}
                          </p>

                          <p className="mt-1 break-words font-semibold text-slate-800">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {visiblePromptAnswers.map(item => (
                <section
                  key={item.prompt}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <p className="text-base font-bold leading-7 text-slate-900">
                    {item.prompt}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </section>
              ))}

              {photos.length > 0 && (
                <p className="text-center text-xs leading-5 text-slate2">
                  Previewing {Math.min(photos.length, MAX_PHOTOS)} of up
                  to {MAX_PHOTOS} uploaded photos.
                </p>
              )}
            </div>
          )}

          {err && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-bad"
            >
              {err}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
            <button
              type="button"
              className="btn-outline"
              disabled={step === 0 || busy}
              onClick={() => {
                setErr(null);
                setStep(current => current - 1);
              }}
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                disabled={busy || (step === 2 && photoCount > MAX_PHOTOS)}
                onClick={next}
              >
                {busy
                  ? 'Saving…'
                  : step === 2
                    ? 'Preview profile'
                    : 'Continue'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={publish}
              >
                {busy ? 'Publishing…' : 'Publish profile'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
