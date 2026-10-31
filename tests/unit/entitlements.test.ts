import { describe, it, expect } from 'vitest';
import { entitlementsFor, PLANS } from '../../src/features/subscriptions/entitlements';

describe('entitlements', () => {
  it('free plan has no premium features', () => {
    const e = entitlementsFor('free');
    expect(e.advancedFilters || e.undoPass || e.incognito || e.readReceipts || e.profileBoost).toBe(false);
  });
  it('defaults to free when no plan is given', () => expect(entitlementsFor()).toEqual(entitlementsFor('free')));
  it('no paid plan is available or priced until the owner configures it', () => {
    for (const p of Object.values(PLANS).filter(p => p.code !== 'free')) { expect(p.available).toBe(false); expect(p.priceInr).toBeNull(); }
  });
  it('returns a copy so callers cannot mutate the free defaults', () => {
    const e = entitlementsFor('free'); e.incognito = true;
    expect(entitlementsFor('free').incognito).toBe(false);
  });
});
