import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Camera,
  Trash2,
  RefreshCw,
} from 'lucide-react';

import {
  listMyPhotos,
  savePhoto,
  removePhoto,
  updatePhotoPrompt,
  type Photo,
} from '../../features/photos/api';

import { reencode } from '../../features/photos/imageProcess';

const LABELS = [
  'Photo 1: main photo',
  'Photo 2',
  'Photo 3',
];

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

export function PhotoSlots({
  uid,
  onChange,
}: {
  uid: string;
  onChange?: (count: number) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const lastFile = useRef<Record<number, File>>({});
  const onChangeRef = useRef(onChange);

  // Keep the latest callback without making refresh depend on its identity.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const refresh = useCallback(async () => {
    try {
      const currentPhotos = await listMyPhotos(uid);

      setPhotos(currentPhotos);
      onChangeRef.current?.(currentPhotos.length);
      setLoadError(null);
    } catch (error) {
      console.error('Could not refresh photos:', error);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Could not load your photos.',
      );
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handle(order: number, file: File) {
    lastFile.current[order] = file;

    setErrors(current => ({
      ...current,
      [order]: '',
    }));

    setBusy(order);

    try {
      const blob = await reencode(file);

      // Preserve the saved prompt when replacing the image in this slot.
      const existingPrompt =
        photos.find(photo => photo.display_order === order)?.prompt ?? null;

      await savePhoto(uid, order, blob, existingPrompt);

      await refresh();
    } catch (error) {
      console.error('Photo upload failed:', error);

      setErrors(current => ({
        ...current,
        [order]:
          error instanceof Error
            ? error.message
            : 'Photo upload failed. Please retry.',
      }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(photo: Photo) {
    const order = photo.display_order;

    setErrors(current => ({
      ...current,
      [order]: '',
    }));

    setBusy(order);

    try {
      await removePhoto(photo);
      await refresh();
    } catch (error) {
      console.error('Photo removal failed:', error);

      setErrors(current => ({
        ...current,
        [order]:
          error instanceof Error
            ? error.message
            : 'Could not remove the photo.',
      }));
    } finally {
      setBusy(null);
    }
  }

  async function changePrompt(order: number, prompt: string) {
    const previousPhotos = photos;

    const targetPhoto = previousPhotos.find(
      photo => photo.display_order === order,
    );

    if (!targetPhoto) return;

    // Update the selected photo and clear the same prompt from other slots.
    const updatedPhotos = previousPhotos.map(photo => {
      if (photo.display_order === order) {
        return {
          ...photo,
          prompt: prompt || null,
        };
      }

      if (prompt && photo.prompt === prompt) {
        return {
          ...photo,
          prompt: null,
        };
      }

      return photo;
    });

    setPhotos(updatedPhotos);

    setErrors(current => ({
      ...current,
      [order]: '',
    }));

    setBusy(order);

    try {
      const changedPhotos = updatedPhotos.filter(photo => {
        const previous = previousPhotos.find(
          item => item.id === photo.id,
        );

        return previous?.prompt !== photo.prompt;
      });

      // Save every changed slot so prompts remain unique.
      for (const photo of changedPhotos) {
        await updatePhotoPrompt(
          uid,
          photo.display_order,
          photo.prompt,
        );
      }

      // Reload from Supabase to confirm persisted values.
      await refresh();
    } catch (error) {
      console.error('Prompt save failed:', error);

      // Restore the previous UI if the database update fails.
      setPhotos(previousPhotos);

      setErrors(current => ({
        ...current,
        [order]:
          error instanceof Error
            ? error.message
            : 'Could not save the prompt. Please retry.',
      }));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <p role="status" className="text-slate2">
        Loading your photos…
      </p>
    );
  }

  return (
    <div>
      {loadError && (
        <p role="alert" className="mb-3 text-bad">
          {loadError}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </p>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(order => {
          const photo = photos.find(
            item => item.display_order === order,
          );

          const working = busy === order;
          const selectedPrompt = photo?.prompt ?? '';

          return (
            <li key={order} className="min-w-0">
              <label
                htmlFor={`photo-prompt-${order}`}
                className="mb-2 block text-sm font-semibold text-ink"
              >
                Prompt{' '}
                <span className="font-normal text-slate2">
                  (optional)
                </span>
              </label>

              <select
                id={`photo-prompt-${order}`}
                value={selectedPrompt}
                disabled={!photo || working}
                onChange={event =>
                  void changePrompt(order, event.target.value)
                }
                className="mb-3 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">
                  No prompt — just my photo
                </option>

                {PHOTO_PROMPTS.map(prompt => (
                  <option
                    key={prompt}
                    value={prompt}
                    disabled={photos.some(
                      item =>
                        item.display_order !== order &&
                        item.prompt === prompt,
                    )}
                  >
                    {prompt}
                  </option>
                ))}
              </select>

              <div className="relative aspect-[3/4] overflow-hidden rounded-card border border-dashed border-line bg-mist">
                {photo ? (
                  <img
                    src={photo.url}
                    alt={`${LABELS[order - 1]} preview`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      inputs.current[order - 1]?.click()
                    }
                    disabled={working}
                    className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-1 text-slate2"
                  >
                    <Camera
                      className="h-6 w-6"
                      aria-hidden="true"
                    />

                    <span className="px-1 text-center text-sm">
                      Add {LABELS[order - 1].toLowerCase()}
                    </span>
                  </button>
                )}

                {photo && selectedPrompt && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-12 pt-8">
                    <p className="text-sm font-semibold leading-snug text-white drop-shadow">
                      {selectedPrompt}
                    </p>
                  </div>
                )}

                {working && (
                  <div
                    className="absolute inset-0 grid place-items-center bg-white/80 text-sm font-semibold"
                    role="status"
                  >
                    Saving…
                  </div>
                )}

                {photo && !working && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 p-1.5">
                    <button
                      type="button"
                      aria-label={`Replace ${LABELS[order - 1]}`}
                      onClick={() =>
                        inputs.current[order - 1]?.click()
                      }
                      className="rounded p-1.5 text-white hover:bg-white/15"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      aria-label={`Remove ${LABELS[order - 1]}`}
                      onClick={() => void remove(photo)}
                      className="rounded p-1.5 text-white hover:bg-white/15"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

             <input
  ref={element => {
    inputs.current[order - 1] = element;
  }}
  type="file"
  accept="image/*"
  hidden
  aria-label={LABELS[order - 1]}
  onChange={event => {
    const file = event.target.files?.[0];

    // Allow selecting the same image again.
    event.target.value = '';

    if (file) {
      void handle(order, file);
    }
  }}
/>
              {errors[order] && (
                <p role="alert" className="mt-1 text-sm text-bad">
                  {errors[order]}{' '}

                  {lastFile.current[order] && (
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        void handle(
                          order,
                          lastFile.current[order],
                        )
                      }
                    >
                      Retry
                    </button>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-sm text-slate2">
        {photos.length} of 3 photos added. All three are required
        to publish, but prompts are optional. Changing a photo
        removes your verified badge. Location data is removed
        from photos before upload.
      </p>
    </div>
  );
}