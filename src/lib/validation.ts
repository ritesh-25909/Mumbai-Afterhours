import { z } from 'zod';
import { MIN_AGE } from './constants';

export const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.')
});

export function ageFromDob(dob: string, today = new Date()): number {
  const d = new Date(dob);
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

// UI convenience only. The database trigger enforces 18+ authoritatively.
export const isAdult = (dob: string) => ageFromDob(dob) >= MIN_AGE;

export const splitList = (s: string, max = 15) =>
  s.split(',').map(x => x.trim()).filter(Boolean).slice(0, max);

export const basicsSchema = z.object({
  display_name: z.string().trim().min(2, 'Enter a name of at least 2 characters.').max(40, 'Keep your name under 40 characters.'),
  date_of_birth: z.string().min(1, 'Enter your date of birth.').refine(isAdult, 'You must be 18 or older to use Mumbai Afterhours.'),
  gender: z.enum(['woman', 'man', 'non-binary'], { errorMap: () => ({ message: 'Choose how you identify.' }) }),
  interested_in: z.array(z.string()).min(1, 'Choose at least one option.'),
  neighbourhood: z.string().trim().max(60).optional(),
  bio: z.string().trim().min(10, 'Write at least a short bio (10 characters).').max(500, 'Keep your bio under 500 characters.'),
  languages: z.array(z.string()).max(10),
  interests: z.array(z.string()).max(15, 'Pick up to 15 interests.'),
  relationship_intention: z.string().optional()
});

export const prefsSchema = z.object({
  minimum_age: z.number().int().min(18, 'Minimum age is 18.'),
  maximum_age: z.number().int().max(99)
}).refine(v => v.minimum_age <= v.maximum_age, { message: 'Minimum age cannot exceed maximum age.', path: ['maximum_age'] });
