export const BRAND = { name: 'Mumbai Afterhours', tagline: 'Real People. Meaningful Connections. Mumbai.' };
export const MIN_AGE = 18;
export const PHOTO_COUNT = 3;
export const POLICY_VERSION = '2026-10-draft';
export const GENDERS = ['woman', 'man', 'non-binary'] as const;
export const INTENTIONS = ['Long-term relationship', 'Something casual', 'Open to see where it goes', 'Friendship first'] as const;
export const PHOTO_RULES = { maxBytes: 8 * 1024 * 1024, minSide: 600, maxSide: 6000, outputSide: 1600, types: ['image/jpeg', 'image/png', 'image/webp'] };

// Absolute URL for auth redirects. Respects a sub-path deployment (e.g. GitHub Pages /repo/).
export const appUrl = (path = '/') => window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '') + path;
