import { describe, it, expect } from 'vitest';
import { ageFromDob, isAdult, basicsSchema, prefsSchema } from '../../src/lib/validation';
import { checkFile, checkDimensions } from '../../src/features/photos/imageProcess';

const base = { display_name: 'Asha', date_of_birth: '1995-05-05', gender: 'woman', interested_in: ['man'], bio: 'Love live music and chai.', languages: [], interests: [] };

describe('age', () => {
  it('computes age around birthday', () => {
    expect(ageFromDob('2000-06-15', new Date('2026-06-14'))).toBe(25);
    expect(ageFromDob('2000-06-15', new Date('2026-06-15'))).toBe(26);
  });
  it('rejects minors', () => {
    const y = new Date().getFullYear() - 17;
    expect(isAdult(`${y}-01-01`)).toBe(false);
  });
});
describe('profile schema', () => {
  it('accepts a valid profile', () => expect(basicsSchema.safeParse(base).success).toBe(true));
  it('rejects under-18 dob', () => expect(basicsSchema.safeParse({ ...base, date_of_birth: `${new Date().getFullYear() - 10}-01-01` }).success).toBe(false));
  it('requires interested_in', () => expect(basicsSchema.safeParse({ ...base, interested_in: [] }).success).toBe(false));
  it('rejects min age above max', () => expect(prefsSchema.safeParse({ minimum_age: 40, maximum_age: 30 }).success).toBe(false));
});
describe('photo checks', () => {
  it('rejects gif', () => expect(checkFile({ type: 'image/gif', size: 100 }).ok).toBe(false));
  it('rejects oversize', () => expect(checkFile({ type: 'image/png', size: 9 * 1024 * 1024 }).ok).toBe(false));
  it('rejects tiny images', () => expect(checkDimensions(300, 400).ok).toBe(false));
  it('accepts normal photo', () => expect(checkDimensions(1200, 1600).ok).toBe(true));
});
