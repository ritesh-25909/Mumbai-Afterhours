
import { useRef, useState } from 'react';
import type { ElementType, PointerEvent } from 'react';

import {
  BadgeCheck,
  Heart,
  X,
  MapPin,
  Navigation,
  GraduationCap,
  BriefcaseBusiness,
  Ruler,
  Cigarette,
  Wine,
  Languages,
  Sparkles,
} from 'lucide-react';

import type { Candidate } from '../../features/discovery/api';

type ProfilePromptAnswer = {
  prompt: string;
  answer: string;
};

type ExtendedCandidate = Candidate & {
  profile_prompts?: ProfilePromptAnswer[] | null;
};

const reduced = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ProfileCard({
  c,
  busy,
  onLike,
  onPass,
  distanceKm,
}: {
  c: Candidate;
  busy: boolean;
  onLike: () => void;
  onPass: () => void;
  distanceKm?: number | null;
}) {
  const candidate = c as ExtendedCandidate;

  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const captured = useRef(false);

  const photos = candidate.photoUrls ?? [];
  const photoPrompts = candidate.photo_prompts ?? [];

  const profilePrompts = (candidate.profile_prompts ?? []).filter(
    item =>
      item &&
      typeof item.prompt === 'string' &&
      typeof item.answer === 'string' &&
      item.prompt.trim() &&
      item.answer.trim()
  );

  function down(e: PointerEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest('button')) return;

    start.current = e.clientX;
    captured.current = false;
  }

  function move(e: PointerEvent<HTMLElement>) {
    if (start.current === null || busy) return;

    const distance = e.clientX - start.current;

    if (!captured.current && Math.abs(distance) > 8) {
      e.currentTarget.setPointerCapture(e.pointerId);
      captured.current = true;
    }

    if (captured.current) {
      setDx(distance);
    }
  }

  function up() {
    if (start.current !== null && captured.current && !busy) {
      if (dx > 110) onLike();
      else if (dx < -110) onPass();
    }

    start.current = null;
    captured.current = false;
    setDx(0);
  }

  function Detail({
    icon: Icon,
    label,
    value,
  }: {
    icon: ElementType;
    label: string;
    value: string | null;
  }) {
    if (!value?.trim()) return null;

    return (
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-line/70 bg-white p-3">
        <Icon className="h-5 w-5 shrink-0 text-royal" />

        <div className="min-w-0">
          <p className="text-xs text-slate2">{label}</p>
          <p className="break-words text-sm font-semibold text-ink">
            {value}
          </p>
        </div>
      </div>
    );
  }

  const lifestyle = [
    {
      label: 'Smoking',
      value: candidate.smoking,
      icon: Cigarette,
    },
    {
      label: 'Drinking',
      value: candidate.alcohol,
      icon: Wine,
    },
  ].filter(item => item.value?.trim());

  return (
    <div className="mx-auto w-full max-w-md">
      <article
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          transform: `translateX(${dx}px) rotate(${reduced() ? 0 : dx / 25}deg)`,
          touchAction: 'pan-y',
        }}
        className="relative select-none space-y-5"
        aria-label={`${candidate.display_name}, ${candidate.age}`}
      >
        {/* MAIN PHOTO CARD */}
        <section className="overflow-hidden rounded-[28px] border border-line/70 bg-white shadow-card">
          {photoPrompts[0]?.trim() && (
            <div className="border-b border-line/70 bg-white px-5 py-4">
              <p className="text-left text-base font-bold leading-relaxed text-ink">
                {photoPrompts[0]}
              </p>
            </div>
          )}

          <div className="relative overflow-hidden bg-mist">
            {photos[0] ? (
              <img
                src={photos[0]}
                alt={`${candidate.display_name}, main profile photo`}
                draggable={false}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center text-slate2">
                No profile photo available
              </div>
            )}

            {dx > 40 && (
              <span className="absolute left-5 top-10 rounded-lg border-2 border-ok px-4 py-2 text-xl font-extrabold text-ok">
                LIKE
              </span>
            )}

            {dx < -40 && (
              <span className="absolute right-5 top-10 rounded-lg border-2 border-bad px-4 py-2 text-xl font-extrabold text-bad">
                PASS
              </span>
            )}

            {/* PROFILE NAME AND LOCATION */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-28 text-white">
              <h2 className="flex items-center gap-2 text-3xl font-extrabold">
                {candidate.display_name}, {candidate.age}

                {candidate.verified && (
                  <BadgeCheck
                    className="h-6 w-6 shrink-0 text-sky-300"
                    aria-label="Verified"
                  />
                )}
              </h2>

              {candidate.neighbourhood && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
                  <MapPin className="h-4 w-4" />
                  {candidate.neighbourhood}, Mumbai
                </p>
              )}

              {/* APPROXIMATE DISTANCE */}
              {distanceKm !== null &&
                distanceKm !== undefined &&
                Number.isFinite(distanceKm) && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Navigation className="h-3.5 w-3.5" />

                    Approx.{' '}
                    {distanceKm < 10
                      ? distanceKm.toFixed(1)
                      : Math.round(distanceKm)}{' '}
                    km away
                  </p>
                )}
            </div>
          </div>
        </section>

        {/* PROFILE DETAILS */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Detail
              icon={GraduationCap}
              label="University / College"
              value={candidate.college}
            />

            <Detail
              icon={GraduationCap}
              label="Education"
              value={candidate.education_status}
            />

            <Detail
              icon={BriefcaseBusiness}
              label="Occupation"
              value={candidate.occupation}
            />

            <Detail
              icon={Ruler}
              label="Height"
              value={candidate.height}
            />
          </div>
        </section>

        {/* LIFESTYLE */}
        {(lifestyle.length > 0 || candidate.religion) && (
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-ink">
              Lifestyle
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {lifestyle.map(item => {
                const Icon = item.icon;

                return (
                  <Detail
                    key={item.label}
                    icon={Icon}
                    label={item.label}
                    value={item.value}
                  />
                );
              })}

              <Detail
                icon={Sparkles}
                label="Religion"
                value={candidate.religion}
              />
            </div>
          </section>
        )}

        {/* ABOUT */}
        {candidate.bio && (
          <section className="space-y-2">
            <h3 className="text-lg font-bold text-ink">
              About
            </h3>

            <p className="whitespace-pre-line text-[15px] leading-7 text-ink/80">
              {candidate.bio}
            </p>
          </section>
        )}

        {/* INTERESTS */}
        {candidate.interests.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-ink">
              Interests
            </h3>

            <div className="flex flex-wrap gap-2">
              {candidate.interests.map(item => (
                <span
                  key={item}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* RELATIONSHIP INTENTION */}
        {candidate.relationship_intention && (
          <section className="rounded-[22px] bg-royal/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-royal">
              Looking for
            </p>

            <p className="mt-2 font-semibold text-ink">
              {candidate.relationship_intention}
            </p>
          </section>
        )}

        {/* LANGUAGES */}
        {candidate.languages.length > 0 && (
          <section className="flex items-start gap-3 rounded-2xl bg-white p-4">
            <Languages className="mt-1 h-5 w-5 shrink-0 text-royal" />

            <div>
              <p className="font-semibold text-ink">
                Languages
              </p>

              <p className="mt-1 text-sm text-slate2">
                {candidate.languages.join(', ')}
              </p>
            </div>
          </section>
        )}

        {/* ADDITIONAL PHOTO CARDS */}
        {photos.slice(1).map((url, index) => {
          const photoIndex = index + 1;
          const prompt = photoPrompts[photoIndex];

          return (
            <div
              key={`${candidate.id}-photo-${photoIndex}`}
              className="space-y-5"
            >
              <section className="overflow-hidden rounded-[28px] border border-line/70 bg-white shadow-card">
                {prompt?.trim() && (
                  <div className="border-b border-line/70 bg-white px-5 py-4">
                    <p className="text-left text-base font-bold leading-relaxed text-ink">
                      {prompt}
                    </p>
                  </div>
                )}

                <div className="overflow-hidden bg-mist">
                  <img
                    src={url}
                    alt={`${candidate.display_name}, photo ${photoIndex + 1}`}
                    loading="lazy"
                    draggable={false}
                    className="w-full object-cover"
                  />
                </div>
              </section>

              {/* PROFILE PROMPTS AFTER SECOND PHOTO */}
              {photoIndex === 1 &&
                profilePrompts.map((item, promptIndex) => (
                  <section
                    key={`${candidate.id}-profile-prompt-${promptIndex}`}
                    className="rounded-[24px] border border-line/70 bg-white px-5 py-5 shadow-card"
                  >
                    <p className="text-base font-bold leading-relaxed text-ink">
                      {item.prompt}
                    </p>

                    <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-7 text-slate2">
                      {item.answer}
                    </p>
                  </section>
                ))}
            </div>
          );
        })}

        {/* FALLBACK: PROFILE PROMPTS WITHOUT SECOND PHOTO */}
        {photos.length < 2 &&
          profilePrompts.map((item, index) => (
            <section
              key={`${candidate.id}-profile-prompt-${index}`}
              className="rounded-[24px] border border-line/70 bg-white px-5 py-5 shadow-card"
            >
              <p className="text-base font-bold leading-relaxed text-ink">
                {item.prompt}
              </p>

              <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-7 text-slate2">
                {item.answer}
              </p>
            </section>
          ))}
      </article>

      {/* LIKE / PASS ACTIONS */}
      <div className="sticky bottom-3 z-20 mt-5 flex justify-center gap-7 rounded-full bg-white/90 py-3 backdrop-blur-md">
        <button
          onClick={onPass}
          disabled={busy}
          aria-label={`Pass on ${candidate.display_name}`}
          className="grid h-16 w-16 place-items-center rounded-full border border-line bg-white text-bad shadow-card disabled:opacity-50"
        >
          <X className="h-8 w-8" />
        </button>

        <button
          onClick={onLike}
          disabled={busy}
          aria-label={`Like ${candidate.display_name}`}
          className="grid h-16 w-16 place-items-center rounded-full bg-royal text-white shadow-card disabled:opacity-50"
        >
          <Heart className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
