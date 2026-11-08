import { supabase } from '../../lib/supabase';

export type LikeCreditSummary = {
  daily_free_remaining: number;
  referral_bonus_credits: number;
  daily_resets_at: string;
};

export type ReferralDashboard = {
  referral_code: string;
  successful_referrals: number;
  total_bonus_earned: number;
  available_bonus_credits: number;
  history: Array<{ invitee_name: string; status: string; bonus_awarded: number; created_at: string }>;
};

const REFERRAL_STORAGE_KEY = 'ma_pending_referral_code_v1';

export function captureReferralFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref')?.trim().toUpperCase();
  if (code && /^[A-F0-9]{6,12}$/.test(code)) {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, code);
    params.delete('ref');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }
}

export async function claimPendingReferral() {
  const code = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!code) return { rewarded: false };
  const { data, error } = await supabase.rpc('claim_referral_reward', { p_referral_code: code });
  if (error) throw new Error(error.message);
  window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
  const result = data as { rewarded: boolean; bonus_credits?: number; reason?: string };
  if (result.rewarded) window.sessionStorage.setItem('ma_referral_claim_success_v1', '1');
  return result;
}

export async function getLikeCreditSummary(): Promise<LikeCreditSummary> {
  const { data, error } = await supabase.rpc('get_like_credit_summary');
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row as LikeCreditSummary;
}

export async function getReferralDashboard(): Promise<ReferralDashboard> {
  const { data, error } = await supabase.rpc('get_referral_dashboard');
  if (error) throw new Error(error.message);
  return data as ReferralDashboard;
}
