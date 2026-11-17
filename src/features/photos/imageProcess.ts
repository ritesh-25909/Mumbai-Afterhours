
import { PHOTO_RULES } from '../../lib/constants';

export type CheckResult =
  | { ok: true }
  | { ok: false; message: string };

export function checkFile(f: {
  type: string;
  size: number;
}): CheckResult {
  if (!PHOTO_RULES.types.includes(f.type)) {
    return {
      ok: false,
      message: 'Use a JPEG, PNG or WebP image.',
    };
  }

  if (f.size > PHOTO_RULES.maxBytes) {
    return {
      ok: false,
      message: 'That file is over 8 MB. Choose a smaller image.',
    };
  }

  return { ok: true };
}

// Accept smaller images.
// Only reject images exceeding the maximum dimensions.
export function checkDimensions(
  w: number,
  h: number
): CheckResult {
  if (w <= 0 || h <= 0) {
    return {
      ok: false,
      message: 'Invalid image dimensions. Choose another image.',
    };
  }

  if (Math.max(w, h) > PHOTO_RULES.maxSide) {
    return {
      ok: false,
      message: 'Photo dimensions are too large. Choose a smaller image.',
    };
  }

  return { ok: true };
}

/**
 * Processes profile photos:
 * - Accepts images smaller than 600px.
 * - Preserves original aspect ratio.
 * - Never unnecessarily enlarges small images.
 * - Resizes oversized output when needed.
 * - Removes EXIF/GPS metadata through canvas re-encoding.
 * - Exports optimized WebP.
 */
export async function reencode(file: File): Promise<Blob> {
  const fileCheck = checkFile(file);

  if (!fileCheck.ok) {
    throw new Error(fileCheck.message);
  }

  let bmp: ImageBitmap;

  try {
    bmp = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
  } catch {
    throw new Error(
      'We could not read that image. Try a different file.'
    );
  }

  try {
    const dim = checkDimensions(bmp.width, bmp.height);

    if (!dim.ok) {
      throw new Error(dim.message);
    }

    // Resize only when the image exceeds the output limit.
    // Small images are accepted without artificial enlargement.
    const scale = Math.min(
      1,
      PHOTO_RULES.outputSide /
        Math.max(bmp.width, bmp.height)
    );

    const canvas = document.createElement('canvas');

    canvas.width = Math.max(
      1,
      Math.round(bmp.width * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(bmp.height * scale)
    );

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Image processing is unavailable in this browser.'
      );
    }

    context.drawImage(
      bmp,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.90);
    });

    if (!blob) {
      throw new Error(
        'This browser could not process the image. Try another browser.'
      );
    }

    return blob;
  } finally {
    bmp.close();
  }
}
