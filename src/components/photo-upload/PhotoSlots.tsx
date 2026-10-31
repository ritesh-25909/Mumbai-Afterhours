import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Trash2, RefreshCw } from 'lucide-react';
import { listMyPhotos, savePhoto, removePhoto, type Photo } from '../../features/photos/api';
import { reencode } from '../../features/photos/imageProcess';

const LABELS = ['Photo 1: main photo', 'Photo 2', 'Photo 3'];

const PHOTO_PROMPTS = [
  'Leave a one-word review for this photo.',
  'Take me back to this moment.',
  "This could've been us, but…",
  'POV: you had to be there.',
  'The story behind this photo is…',
  'Caption this without context.',
  'Guess what happened five minutes after this.',
  'My most Mumbai-coded moment.',
  "A core memory I'll never forget.",
  'Green flag or red flag?',
  'My friends will never let me forget this.',
  'Rate this life decision.',
];

export function PhotoSlots({ uid, onChange }: { uid: string; onChange?: (count: number) => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  // Prompts are optional and currently kept in component state only.
  const [selectedPrompts, setSelectedPrompts] = useState<Record<number, string>>({});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const lastFile = useRef<Record<number, File>>({});

  const refresh = useCallback(async () => {
    try {
      const p = await listMyPhotos(uid);
      setPhotos(p);
      onChange?.(p.length);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [uid, onChange]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handle(order: number, file: File) {
    lastFile.current[order] = file;
    setErrors(e => ({ ...e, [order]: '' }));
    setBusy(order);
    try {
      const blob = await reencode(file);
      await savePhoto(uid, order, blob);
      await refresh();
    } catch (e) {
      setErrors(x => ({ ...x, [order]: (e as Error).message }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: Photo) {
    setBusy(p.display_order);
    try {
      await removePhoto(p);
      await refresh();
    } catch (e) {
      setErrors(x => ({ ...x, [p.display_order]: (e as Error).message }));
    } finally {
      setBusy(null);
    }
  }

  function changePrompt(order: number, prompt: string) {
    setSelectedPrompts(current => {
      const next = { ...current };
      if (!prompt) {
        delete next[order];
      } else {
        // Keep each selected prompt unique across the three photo slots.
        Object.keys(next).forEach(key => {
          if (Number(key) !== order && next[Number(key)] === prompt) delete next[Number(key)];
        });
        next[order] = prompt;
      }
      return next;
    });
  }

  if (loading) return <p role="status" className="text-slate2">Loading your photos…</p>;

  return (
    <div>
      {loadError && (
        <p role="alert" className="mb-3 text-bad">
          {loadError}{' '}
          <button type="button" className="underline" onClick={refresh}>Retry</button>
        </p>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(order => {
          const p = photos.find(x => x.display_order === order);
          const working = busy === order;
          const selectedPrompt = selectedPrompts[order] ?? '';

          return (
            <li key={order} className="min-w-0">
              <label htmlFor={`photo-prompt-${order}`} className="mb-2 block text-sm font-semibold text-ink">
                Prompt <span className="font-normal text-slate2">(optional)</span>
              </label>
              <select
                id={`photo-prompt-${order}`}
                value={selectedPrompt}
                onChange={e => changePrompt(order, e.target.value)}
                className="mb-3 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">No prompt — just my photo</option>
                {PHOTO_PROMPTS.map(prompt => (
                  <option
                    key={prompt}
                    value={prompt}
                    disabled={Object.entries(selectedPrompts).some(([slot, value]) => Number(slot) !== order && value === prompt)}
                  >
                    {prompt}
                  </option>
                ))}
              </select>

              <div className="relative aspect-[3/4] overflow-hidden rounded-card border border-dashed border-line bg-mist">
                {p ? (
                  <img src={p.url} alt={`${LABELS[order - 1]} preview`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <button
                    type="button"
                    onClick={() => inputs.current[order - 1]?.click()}
                    disabled={working}
                    className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-1 text-slate2"
                  >
                    <Camera className="h-6 w-6" aria-hidden />
                    <span className="px-1 text-center text-sm">Add {LABELS[order - 1].toLowerCase()}</span>
                  </button>
                )}

                {p && selectedPrompt && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-12 pt-8">
                    <p className="text-sm font-semibold leading-snug text-white drop-shadow">{selectedPrompt}</p>
                  </div>
                )}

                {working && (
                  <div className="absolute inset-0 grid place-items-center bg-white/80 text-sm font-semibold" role="status">
                    Uploading…
                  </div>
                )}

                {p && !working && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 p-1.5">
                    <button type="button" aria-label={`Replace ${LABELS[order - 1]}`} onClick={() => inputs.current[order - 1]?.click()} className="rounded p-1.5 text-white hover:bg-white/15">
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button type="button" aria-label={`Remove ${LABELS[order - 1]}`} onClick={() => remove(p)} className="rounded p-1.5 text-white hover:bg-white/15">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={el => { inputs.current[order - 1] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                hidden
                aria-label={LABELS[order - 1]}
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handle(order, file);
                }}
              />

              {errors[order] && (
                <p role="alert" className="mt-1 text-sm text-bad">
                  {errors[order]}{' '}
                  {lastFile.current[order] && (
                    <button type="button" className="underline" onClick={() => handle(order, lastFile.current[order])}>Retry</button>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-sm text-slate2">
        {photos.length} of 3 photos added. All three are required to publish, but prompts are optional.
        Changing a photo removes your verified badge. Location data is removed from photos before upload.
      </p>
    </div>
  );
}
