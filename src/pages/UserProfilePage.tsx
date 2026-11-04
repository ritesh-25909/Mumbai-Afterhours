
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  GraduationCap,
  Briefcase,
  Heart,
  Languages,
  Ruler,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

import {
  fetchMatchedProfile,
  type MatchedProfile,
} from '../features/discovery/api';

type PromptItem = {
  question: string;
  answer: string;
};

// =====================================================
// PROFILE PROMPT PARSER
// =====================================================

function parsePrompts(data: unknown): PromptItem[] {
  if (!data) return [];

  let source = data;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }

  if (!source || typeof source !== 'object') return [];

  const entries = Array.isArray(source)
    ? source.map((item, index) => [String(index), item] as const)
    : Object.entries(source);

  return entries
    .map(([key, value]) => {
      let item: any = value;

      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);

          if (parsed && typeof parsed === 'object') {
            item = parsed;
          } else {
            return {
              question: key,
              answer: item,
            };
          }
        } catch {
          return {
            question: key,
            answer: item,
          };
        }
      }

      if (!item || typeof item !== 'object') return null;

      const question =
        item.prompt ??
        item.question ??
        item.title ??
        '';

      const answer =
        item.answer ??
        item.response ??
        item.value ??
        '';

      if (
        typeof answer !== 'string' ||
        !answer.trim()
      ) {
        return null;
      }

      return {
        question:
          typeof question === 'string' ? question : '',
        answer: answer.trim(),
      };
    })
    .filter(
      (item): item is PromptItem =>
        item !== null && !!item.answer
    );
}

// =====================================================
// AGE CALCULATOR
// =====================================================

function calculateAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();

  const birthdayNotReached =
    today.getMonth() < dob.getMonth() ||
    (
      today.getMonth() === dob.getMonth() &&
      today.getDate() < dob.getDate()
    );

  if (birthdayNotReached) age--;

  return age;
}

// =====================================================
// REUSABLE DETAIL ROW
// =====================================================

function DetailRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-slate-200">
      <span className="mt-0.5 shrink-0 text-blue-400">
        {icon}
      </span>

      <span className="min-w-0 leading-relaxed">
        {children}
      </span>
    </div>
  );
}

// =====================================================
// USER PROFILE PAGE
// =====================================================

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState<MatchedProfile | null>(null);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===================================================
  // LOAD PROFILE
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setError('Invalid profile.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const result = await fetchMatchedProfile(userId);

        if (!cancelled) {
          setProfile(result);
          setPhotoIndex(0);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ===================================================
  // LOADING STATE
  // ===================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#03060d]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />

          <p className="text-sm text-slate-400">
            Loading profile…
          </p>
        </div>
      </div>
    );
  }

  // ===================================================
  // ERROR STATE
  // ===================================================

  if (error || !profile) {
    return (
      <div className="min-h-[60vh] bg-[#03060d] px-4 py-10 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#080f1d] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-blue-500/20 bg-blue-500/10">
            <ImageIcon className="h-6 w-6 text-blue-400" />
          </div>

          <h2 className="text-xl font-bold text-white">
            Profile unavailable
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {error ?? 'This profile cannot be viewed.'}
          </p>

          <button
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ===================================================
  // PROFILE DATA
  // ===================================================

  const photos = profile.photos ?? [];
  const currentPhoto = photos[photoIndex];

  const age = calculateAge(profile.date_of_birth);
  const prompts = parsePrompts(profile.profile_prompts);

  const hasDetails = Boolean(
    profile.occupation ||
    profile.college ||
    profile.education_status ||
    profile.height ||
    profile.languages?.length ||
    profile.relationship_intention
  );

  // ===================================================
  // MAIN PROFILE UI
  // ===================================================

  return (
    <div className="min-h-full w-full bg-[#03060d] px-3 pb-10 pt-4 text-white sm:px-5">

      <div className="mx-auto w-full max-w-2xl space-y-5">

        {/* =========================================
            PROFILE HEADER
        ========================================= */}

        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              grid h-11 w-11 shrink-0 place-items-center
              rounded-full
              border border-white/10
              bg-[#0b1220]
              text-white
              transition
              hover:border-blue-500/50
              hover:bg-blue-500/10
            "
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-xl font-extrabold text-white">
              Profile
            </h1>

            <p className="text-xs text-slate-500">
              Get to know them better
            </p>
          </div>
        </header>

        {/* =========================================
            PROFILE PHOTO GALLERY
        ========================================= */}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#080f1d] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">

          <div className="relative aspect-[4/5] overflow-hidden bg-[#0b1220]">

            {currentPhoto?.photoUrl ? (
              <img
                src={currentPhoto.photoUrl}
                alt={`${profile.display_name} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                <ImageIcon className="h-12 w-12" />
                <span className="text-sm">
                  No profile photo available
                </span>
              </div>
            )}

            {/* PHOTO GRADIENT */}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* PHOTO PROGRESS */}

            {photos.length > 1 && (
              <div className="absolute left-3 right-3 top-3 flex gap-1.5">
                {photos.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition ${
                      index === photoIndex
                        ? 'bg-blue-500 shadow-[0_0_8px_rgba(0,110,255,0.8)]'
                        : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* PREVIOUS PHOTO */}

            {photos.length > 1 && photoIndex > 0 && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() =>
                  setPhotoIndex((index) =>
                    Math.max(0, index - 1)
                  )
                }
                className="absolute inset-y-0 left-0 flex w-1/3 items-center justify-start pl-3 text-white/80 transition hover:text-white"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-black/35 backdrop-blur">
                  <ChevronLeft className="h-6 w-6" />
                </span>
              </button>
            )}

            {/* NEXT PHOTO */}

            {photos.length > 1 && photoIndex < photos.length - 1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={() =>
                  setPhotoIndex((index) =>
                    Math.min(photos.length - 1, index + 1)
                  )
                }
                className="absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-3 text-white/80 transition hover:text-white"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-black/35 backdrop-blur">
                  <ChevronRight className="h-6 w-6" />
                </span>
              </button>
            )}

            {/* PHOTO COUNT */}

            {photos.length > 0 && (
              <span className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {photoIndex + 1} / {photos.length}
              </span>
            )}

            {/* NAME OVER PHOTO */}

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  {profile.display_name}, {age}
                </h2>

                {profile.verified && (
                  <BadgeCheck
                    className="h-7 w-7 shrink-0 fill-blue-500 text-white"
                    aria-label="Verified profile"
                  />
                )}
              </div>

              {(profile.city || profile.neighbourhood) && (
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-400" />

                  {[profile.neighbourhood, profile.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* GALLERY DOTS */}

          {photos.length > 1 && (
            <div className="flex justify-center gap-2 border-t border-white/[0.06] bg-[#080f1d] py-3">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`View photo ${index + 1}`}
                  onClick={() => setPhotoIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === photoIndex
                      ? 'w-6 bg-blue-500'
                      : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          )}
        </section>

        {/* =========================================
            ABOUT ME
        ========================================= */}

        {profile.bio && (
          <section className="rounded-2xl border border-white/10 bg-[#080f1d] p-5 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-blue-500" />

              <h3 className="font-bold text-white">
                About Me
              </h3>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {profile.bio}
            </p>
          </section>
        )}

        {/* =========================================
            INTERESTS
        ========================================= */}

        {profile.interests?.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-[#080f1d] p-5 shadow-lg">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-white">
              <Heart className="h-5 w-5 text-blue-400" />
              Interests
            </h3>

            <div className="flex flex-wrap gap-2">
              {profile.interests.map((item) => (
                <span
                  key={item}
                  className="
                    rounded-full
                    border border-blue-500/20
                    bg-blue-500/10
                    px-4 py-2
                    text-sm font-medium
                    text-blue-200
                  "
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* =========================================
            MORE ABOUT ME
        ========================================= */}

        {hasDetails && (
          <section className="rounded-2xl border border-white/10 bg-[#080f1d] p-5 shadow-lg">
            <h3 className="mb-5 font-bold text-white">
              More about me
            </h3>

            <div className="space-y-5">

              {profile.occupation && (
                <DetailRow icon={<Briefcase className="h-5 w-5" />}>
                  {profile.occupation}
                </DetailRow>
              )}

              {profile.college && (
                <DetailRow icon={<GraduationCap className="h-5 w-5" />}>
                  {profile.college}
                </DetailRow>
              )}

              {profile.education_status && (
                <DetailRow icon={<GraduationCap className="h-5 w-5" />}>
                  Education: {profile.education_status}
                </DetailRow>
              )}

              {profile.height && (
                <DetailRow icon={<Ruler className="h-5 w-5" />}>
                  {profile.height}
                </DetailRow>
              )}

              {profile.languages?.length > 0 && (
                <DetailRow icon={<Languages className="h-5 w-5" />}>
                  {profile.languages.join(', ')}
                </DetailRow>
              )}

              {profile.relationship_intention && (
                <DetailRow icon={<Heart className="h-5 w-5" />}>
                  Looking for: {profile.relationship_intention}
                </DetailRow>
              )}
            </div>
          </section>
        )}

        {/* =========================================
            PROFILE PROMPTS
        ========================================= */}

        {prompts.length > 0 && (
          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-lg font-extrabold text-white">
                A little more about me
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Get to know their personality
              </p>
            </div>

            {prompts.map((item, index) => (
              <article
                key={`${item.question}-${index}`}
                className="
                  relative overflow-hidden
                  rounded-2xl
                  border border-blue-500/20
                  bg-gradient-to-br
                  from-[#101d34]
                  via-[#091323]
                  to-[#080f1d]
                  p-5
                  shadow-lg
                "
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/[0.07] blur-2xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-400" />

                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-400">
                      Get to know me
                    </span>
                  </div>

                  {item.question && (
                    <h4 className="text-lg font-extrabold leading-snug text-white">
                      {item.question}
                    </h4>
                  )}

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {item.answer}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* =========================================
            PHOTO CAPTIONS
        ========================================= */}

        {photos.some((photo) => photo.prompt) && (
          <section className="rounded-2xl border border-white/10 bg-[#080f1d] p-5">
            <h3 className="mb-4 font-bold text-white">
              Photo captions
            </h3>

            <div className="space-y-3">
              {photos
                .filter((photo) => photo.prompt)
                .map((photo, index) => (
                  <p
                    key={index}
                    className="border-l-2 border-blue-500/60 pl-3 text-sm leading-relaxed text-slate-300"
                  >
                    {photo.prompt}
                  </p>
                ))}
            </div>
          </section>
        )}

        {/* =========================================
            BACK TO CHAT
        ========================================= */}

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="
            flex w-full items-center justify-center gap-2
            rounded-xl
            border border-blue-500/30
            bg-blue-600/10
            px-5 py-3.5
            text-sm font-bold
            text-blue-300
            transition
            hover:border-blue-400/60
            hover:bg-blue-600/20
          "
        >
          <ArrowLeft className="h-4 w-4" />
          Back to messages
        </button>

      </div>
    </div>
  );
}
