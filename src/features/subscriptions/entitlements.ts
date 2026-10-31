// Entitlements for a future paid tier. Billing is NOT implemented: everyone is on the free plan.
// When billing launches, entitlements must come from a verified server-side record (payment-provider webhook ->
// `subscriptions` table), never from a value the browser sends. Essential safety tools are never gated.

export type PlanCode = 'free' | 'premium_monthly' | 'premium_quarterly' | 'premium_annual';

export type Plan = { code: PlanCode; label: string; priceInr: number | null; available: boolean };
// Prices are intentionally null: the owner must decide and confirm them before any plan is offered.
export const PLANS: Record<PlanCode, Plan> = {
  free: { code: 'free', label: 'Free', priceInr: 0, available: true },
  premium_monthly: { code: 'premium_monthly', label: 'Premium monthly', priceInr: null, available: false },
  premium_quarterly: { code: 'premium_quarterly', label: 'Premium quarterly', priceInr: null, available: false },
  premium_annual: { code: 'premium_annual', label: 'Premium annual', priceInr: null, available: false }
};

export type Entitlements = { dailyLikeLimit: number | null; advancedFilters: boolean; undoPass: boolean; incognito: boolean; readReceipts: boolean; profileBoost: boolean };

const FREE: Entitlements = { dailyLikeLimit: null, advancedFilters: false, undoPass: false, incognito: false, readReceipts: false, profileBoost: false };
const PREMIUM: Entitlements = { dailyLikeLimit: null, advancedFilters: true, undoPass: true, incognito: true, readReceipts: true, profileBoost: true };

export function entitlementsFor(plan: PlanCode = 'free'): Entitlements {
  return plan === 'free' ? { ...FREE } : { ...PREMIUM };
}

export const FREE_FEATURES = [
  'Account and three-photo profile', 'Discover, like and pass', 'Mutual matching', 'Messaging after matching',
  'Age-range filter', 'Report, block and unmatch', 'Selfie verification', 'Account deletion'
];
export const PLANNED_PREMIUM = ['Higher daily like limits', 'Advanced discovery filters', 'Undo a pass', 'Incognito browsing', 'Read receipts', 'Profile boosts'];
