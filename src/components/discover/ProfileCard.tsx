
import { useRef, useState } from 'react';
import type { ElementType, PointerEvent } from 'react';

import {
  BadgeCheck,
  Heart,
  X,
  MapPin,
  GraduationCap,
  BriefcaseBusiness,
  Ruler,
  Cigarette,
  Wine,
  Languages,
  Sparkles
} from 'lucide-react';

import type { Candidate } from '../../features/discovery/api';

const reduced = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ProfileCard({
  c,
  busy,
  onLike,
  onPass
}: {
  c: Candidate;
  busy: boolean;
  onLike: () => void;
  onPass: () => void;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const captured = useRef(false);

  const photos = c.photoUrls ?? [];
  const prompts = c.photo_prompts ?? [];

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
    value
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

  // Show each prompt without a section heading.
  function PhotoPrompt({ prompt }: { prompt: string | null }) {
    if (!prompt?.trim()) return null;

    return (
      <div className="rounded-[24px] border border-line/70 bg-white px-5 py-6 shadow-card">
        <p className="whitespace-pre-line text-xl font-semibold leading-relaxed text-ink">
          {prompt}
        </p>
      </div>
    );
  }

  const lifestyle = [
    {
      label: 'Smoking',
      value: c.smoking,
      icon: Cigarette
    },
    {
      label: 'Drinking',
      value: c.alcohol,
      icon: Wine
    }
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
          touchAction: 'pan-y'
        }}
        className="relative select-none space-y-5"
        aria-label={`${c.display_name}, ${c.age}`}
      >

        {/* 1. MAIN PROFILE IMAGE */}

        <section className="relative overflow-hidden rounded-[28px] bg-mist shadow-card">

          {photos[0] ? (
            <img
              src={photos[0]}
              alt={`${c.display_name}, main profile photo`}
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

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-28 text-white">

            <h2 className="flex items-center gap-2 text-3xl font-extrabold">
              {c.display_name}, {c.age}

              {c.verified && (
                <BadgeCheck
                  className="h-6 w-6 shrink-0 text-sky-300"
                  aria-label="Verified"
                />
              )}
            </h2>

            {c.neighbourhood && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
                <MapPin className="h-4 w-4" />
                {c.neighbourhood}, Mumbai
              </p>
            )}
          </div>
        </section>

        {/* 2. PROFILE DETAILS */}

        <section className="space-y-3">

          <div className="grid grid-cols-2 gap-2">

            <Detail
              icon={GraduationCap}
              label="University / College"
              value={c.college}
            />

            <Detail
              icon={GraduationCap}
              label="Education"
              value={c.education_status}
            />

            <Detail
              icon={BriefcaseBusiness}
              label="Occupation"
              value={c.occupation}
            />

            <Detail
              icon={Ruler}
              label="Height"
              value={c.height}
            />

          </div>
        </section>

        {/* 3. LIFESTYLE DETAILS */}

        {(lifestyle.length > 0 || c.religion) && (
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
                value={c.religion}
              />

            </div>
          </section>
        )}

        {/* 4. ABOUT */}

        {c.bio && (
          <section className="space-y-2">

            <h3 className="text-lg font-bold text-ink">
              About
            </h3>

            <p className="whitespace-pre-line text-[15px] leading-7 text-ink/80">
              {c.bio}
            </p>

          </section>
        )}

        {/* 5. INTERESTS */}

        {c.interests.length > 0 && (
          <section className="space-y-3">

            <h3 className="text-lg font-bold text-ink">
              Interests
            </h3>

            <div className="flex flex-wrap gap-2">

              {c.interests.map(item => (
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

        {/* 6. RELATIONSHIP INTENTION */}

        {c.relationship_intention && (
          <section className="rounded-[22px] bg-royal/5 p-4">

            <p className="text-xs font-bold uppercase tracking-wider text-royal">
              Looking for
            </p>

            <p className="mt-2 font-semibold text-ink">
              {c.relationship_intention}
            </p>

          </section>
        )}

        {/* 7. LANGUAGES */}

        {c.languages.length > 0 && (
          <section className="flex items-start gap-3 rounded-2xl bg-white p-4">

            <Languages className="mt-1 h-5 w-5 shrink-0 text-royal" />

            <div>
              <p className="font-semibold text-ink">
                Languages
              </p>

              <p className="mt-1 text-sm text-slate2">
                {c.languages.join(', ')}
              </p>
            </div>

          </section>
        )}

        {/* 8. FIRST PHOTO'S PROMPT */}

        <PhotoPrompt prompt={prompts[0] ?? null} />

        {/* 9. ALTERNATING PHOTOS AND PROMPTS */}

        {photos.slice(1).map((url, index) => {

          const photoIndex = index + 1;
          const isLastPhoto = photoIndex === photos.length - 1;

          return (
            <section
              key={`${c.id}-photo-${photoIndex}`}
              className="space-y-5"
            >

              {/* PROFILE IMAGE */}

              <div className="overflow-hidden rounded-[26px] bg-mist shadow-card">

                <img
                  src={url}
                  alt={`${c.display_name}, photo ${photoIndex + 1}`}
                  loading="lazy"
                  draggable={false}
                  className="w-full object-cover"
                />

              </div>

              {/* PROMPT BETWEEN PHOTOS */}
              {/* Last photo remains the final element. */}

              {!isLastPhoto && (
                <PhotoPrompt
                  prompt={prompts[photoIndex] ?? null}
                />
              )}

            </section>
          );
        })}

      </article>

      {/* 10. LIKE / PASS ACTIONS */}

      <div className="sticky bottom-3 z-20 mt-5 flex justify-center gap-7 rounded-full bg-white/90 py-3 backdrop-blur-md">

        <button
          onClick={onPass}
          disabled={busy}
          aria-label={`Pass on ${c.display_name}`}
          className="grid h-16 w-16 place-items-center rounded-full border border-line bg-white text-bad shadow-card disabled:opacity-50"
        >
          <X className="h-8 w-8" />
        </button>

        <button
          onClick={onLike}
          disabled={busy}
          aria-label={`Like ${c.display_name}`}
          className="grid h-16 w-16 place-items-center rounded-full bg-royal text-white shadow-card disabled:opacity-50"
        >
          <Heart className="h-8 w-8" />
        </button>

      </div>

    </div>
  );
}
