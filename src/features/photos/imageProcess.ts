import { PHOTO_RULES } from '../../lib/constants';

export type CheckResult = { ok: true } | { ok: false; message: string };

export function checkFile(f: { type: string; size: number }): CheckResult {
  if (!PHOTO_RULES.types.includes(f.type)) return { ok: false, message: 'Use a JPEG, PNG or WebP image.' };
  if (f.size > PHOTO_RULES.maxBytes) return { ok: false, message: 'That file is over 8 MB. Choose a smaller image.' };
  return { ok: true };
}

export function checkDimensions(w: number, h: number): CheckResult {
  if (Math.min(w, h) < PHOTO_RULES.minSide) return { ok: false, message: `Photo is too small. Use one at least ${PHOTO_RULES.minSide}px on its shortest side.` };
  if (Math.max(w, h) > PHOTO_RULES.maxSide) return { ok: false, message: 'Photo dimensions are too large. Choose a smaller image.' };
  return { ok: true };
}

/**
 * Decodes the image and re-draws it on a canvas, then exports WebP.
 * This drops all EXIF/GPS metadata. Orientation is applied during decode.
 * Note: this is a client-side step; it is a privacy convenience, not a security boundary.
 */
export async function reencode(file: File): Promise<Blob> {
  const fileCheck = checkFile(file);
  if (!fileCheck.ok) throw new Error(fileCheck.message);
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('We could not read that image. Try a different file.'); }
  const dim = checkDimensions(bmp.width, bmp.height);
  if (!dim.ok) { bmp.close(); throw new Error(dim.message); }
  const scale = Math.min(1, PHOTO_RULES.outputSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.85));
  if (!blob) throw new Error('This browser could not process the image. Try another browser.');
  return blob;
}
