import {
  BadgeCheck,
  MapPin,
  Heart,
  Images,
  UserRound,
  Tag,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Scan,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ageFromDob } from '../../lib/validation';
import type { Photo } from '../../features/photos/api';

type PhotoDisplayMode = 'full' | 'fill' | 'adjust';

export function ProfilePreview({
  name,
  dob,
  neighbourhood,
  bio,
  interests,
  intention,
  photos,
  verified,
}: {
  name: string;
  dob: string;
  neighbourhood?: string;
  bio: string;
  interests: string[];
  intention?: string;
  photos: Photo[];
  verified?: boolean;
}) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [displayMode, setDisplayMode] = useState<PhotoDisplayMode>('full');
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);

  const currentPhoto = photos[activePhoto];

  useEffect(() => {
    setActivePhoto(index => Math.min(index, Math.max(photos.length - 1, 0)));
  }, [photos.length]);

  useEffect(() => {
    // Each photo starts with a neutral crop position when selected.
    setCropX(50);
    setCropY(50);
    setDisplayMode('full');
  }, [activePhoto]);

  function previousPhoto() {
    if (photos.length < 2) return;
    setActivePhoto(index => (index - 1 + photos.length) % photos.length);
  }

  function nextPhoto() {
    if (photos.length < 2) return;
    setActivePhoto(index => (index + 1) % photos.length);
  }

  const objectPosition = `${cropX}% ${cropY}%`;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-5 text-center sm:mb-7">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-royal">
          Step 4 of 4 · Final preview
        </p>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Your profile, just as others will see it
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
          Choose how your photos look before publishing.
        </p>
      </header>

      <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.30)] sm:rounded-[2rem] sm:p-5">
        {/* Main photo preview */}
        <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-100">
          <div className="relative isolate flex min-h-[360px] items-center justify-center overflow-hidden bg-slate-100 sm:min-h-[500px]">
            {currentPhoto ? (
              <>
                {/* Soft blurred backdrop prevents empty side bars in Full photo mode. */}
                <img
                  src={currentPhoto.url}
                  alt=""
                  aria-hidden="true"
                  className={`absolute inset-0 h-full w-full scale-110 blur-2xl ${
                    displayMode === 'full' ? 'opacity-45' : 'opacity-0'
                  }`}
                />
                {displayMode === 'full' && (
                  <div className="absolute inset-0 bg-slate-950/15" />
                )}

                <img
                  src={currentPhoto.url}
                  alt={`${name}, profile photo ${activePhoto + 1}`}
                  className={
                    displayMode === 'full'
                      ? 'relative z-10 max-h-[500px] w-full object-contain sm:max-h-[620px]'
                      : 'relative z-10 h-[min(72vh,620px)] min-h-[360px] w-full object-cover'
                  }
                  style={
                    displayMode === 'full'
                      ? undefined
                      : { objectPosition }
                  }
                />

                {photos.length > 1 && (
                  <>
                    <div className="absolute left-3 top-3 z-20 rounded-full border border-white/20 bg-slate-950/65 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur">
                      {activePhoto + 1} / {photos.length}
                    </div>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={previousPhoto}
                      className="absolute left-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/95 text-slate-900 shadow-lg transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-royal focus:ring-offset-2"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={nextPhoto}
                      className="absolute right-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/95 text-slate-900 shadow-lg transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-royal focus:ring-offset-2"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent px-5 pb-5 pt-20 sm:px-7 sm:pb-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-extrabold tracking-tight text-white drop-shadow sm:text-3xl">
                      {name}, {ageFromDob(dob)}
                    </h3>
                    {verified && (
                      <BadgeCheck
                        className="h-6 w-6 shrink-0 text-sky-300"
                        aria-label="Verified"
                      />
                    )}
                  </div>
                  {neighbourhood && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white drop-shadow sm:text-base">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {neighbourhood}, Mumbai
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="grid min-h-[360px] place-items-center text-slate-400 sm:min-h-[500px]">
                <div className="text-center">
                  <Images className="mx-auto mb-3 h-11 w-11" />
                  <p className="text-sm font-semibold">Your photos will appear here</p>
                </div>
              </div>
            )}
          </div>

          {/* Photo display controls */}
          {currentPhoto && (
            <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-royal" />
                <p className="text-sm font-bold text-slate-800">Adjust photo display</p>
                <span className="ml-auto text-[11px] font-medium text-slate-400">
                  Preview only
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayMode('full')}
                  aria-pressed={displayMode === 'full'}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition ${
                    displayMode === 'full'
                      ? 'border-royal bg-blue-50 text-royal ring-1 ring-royal/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Maximize2 className="h-5 w-5" />
                  <span className="text-xs font-bold">Full photo</span>
                  {displayMode === 'full' && <Check className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setDisplayMode('fill')}
                  aria-pressed={displayMode === 'fill'}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition ${
                    displayMode === 'fill'
                      ? 'border-royal bg-blue-50 text-royal ring-1 ring-royal/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Scan className="h-5 w-5" />
                  <span className="text-xs font-bold">Fill frame</span>
                  {displayMode === 'fill' && <Check className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setDisplayMode('adjust')}
                  aria-pressed={displayMode === 'adjust'}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition ${
                    displayMode === 'adjust'
                      ? 'border-royal bg-blue-50 text-royal ring-1 ring-royal/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  <span className="text-xs font-bold">Adjust crop</span>
                  {displayMode === 'adjust' && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>

              {displayMode === 'full' && (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Your complete photo stays visible. A soft blurred background fills the remaining space.
                </p>
              )}

              {displayMode === 'fill' && (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Your photo fills the frame. Some edges may be cropped to fit.
                </p>
              )}

              {displayMode === 'adjust' && (
                <div className="mt-4 space-y-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
                  <p className="text-xs leading-5 text-slate-600">
                    Move the sliders to choose which part of your photo stays in the frame.
                  </p>
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Horizontal position</span>
                      <span className="tabular-nums text-slate-500">{cropX}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropX}
                      onChange={event => setCropX(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer accent-blue-600"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Vertical position</span>
                      <span className="tabular-nums text-slate-500">{cropY}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={cropY}
                      onChange={event => setCropY(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer accent-blue-600"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCropX(50);
                      setCropY(50);
                    }}
                    className="text-xs font-bold text-royal underline underline-offset-2 hover:text-blue-800"
                  >
                    Reset crop position
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Profile information */}
        <div className="space-y-7 px-1 pb-2 pt-5 sm:space-y-8 sm:px-2 sm:pt-6">
          {intention && (
            <section className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-4 sm:p-5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-royal shadow-sm ring-1 ring-blue-100">
                <Heart className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Looking for
                </p>
                <p className="mt-1 break-words text-base font-bold text-royal sm:text-lg">
                  {intention}
                </p>
              </div>
            </section>
          )}

          {bio?.trim() && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                  A little about me
                </h4>
              </div>
              <p className="whitespace-pre-wrap break-words pl-1 text-base leading-7 text-slate-600 sm:pl-[3.25rem] sm:text-[17px] sm:leading-8">
                {bio}
              </p>
            </section>
          )}

          {interests.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-700">
                  <Tag className="h-5 w-5" />
                </div>
                <h4 className="flex-1 text-lg font-extrabold text-slate-900 sm:text-xl">
                  My interests
                </h4>
              </div>
              <ul className="flex flex-wrap gap-2.5 sm:pl-[3.25rem]">
                {interests.map(interest => (
                  <li
                    key={interest}
                    className="max-w-full break-words rounded-full border border-blue-100 bg-blue-50/80 px-4 py-2.5 text-sm font-medium leading-5 text-slate-700 sm:text-base"
                  >
                    {interest}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {photos.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-700">
                  <Images className="h-5 w-5" />
                </div>
                <h4 className="flex-1 text-lg font-extrabold text-slate-900 sm:text-xl">
                  My photos <span className="font-semibold text-slate-400">({photos.length})</span>
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {photos.slice(0, 3).map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    aria-label={`View photo ${index + 1}`}
                    aria-pressed={activePhoto === index}
                    className={`overflow-hidden rounded-2xl bg-slate-100 text-left ring-offset-2 transition focus:outline-none focus:ring-2 focus:ring-royal ${
                      activePhoto === index ? 'ring-2 ring-royal' : 'ring-1 ring-slate-200'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`${name}'s photo ${index + 1}`}
                      loading="lazy"
                      className="aspect-[3/4] w-full bg-slate-100 object-contain"
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Select a thumbnail to preview and adjust that photo.
              </p>
            </section>
          )}

          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-royal shadow-sm">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Your next connection starts here.</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Choose the photo style that feels most like you. Your original uploads stay unchanged.
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
