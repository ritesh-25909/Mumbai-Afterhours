import { supabase } from '../../lib/supabase';

/** Shape returned by the deployed Supabase admin_dashboard_stats() RPC. */
export type AdminDashboardStats = {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  complete_profiles: number;
  verified_users: number;
  active_matches: number;
  total_messages: number;
  open_reports: number;
  pending_verifications: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [{ data, error }, pending] = await Promise.all([
    supabase.rpc('admin_dashboard_stats'),
    supabase.rpc('list_pending_verifications'),
  ]);
  if (error) throw new Error(error.message || 'Unable to load admin statistics.');
  if (pending.error) throw new Error(pending.error.message || 'Unable to load pending verification count.');
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!row || typeof row !== 'object') throw new Error('The admin dashboard returned no statistics.');
  const number = (key: string) => Number(row[key] ?? 0) || 0;
  return {
    total_users: number('total_users'),
    new_users_7d: number('new_users_7d'),
    new_users_30d: number('new_users_30d'),
    complete_profiles: number('complete_profiles'),
    verified_users: number('verified_users'),
    active_matches: number('active_matches'),
    total_messages: number('total_messages'),
    open_reports: number('open_reports'),
    pending_verifications: Array.isArray(pending.data) ? pending.data.length : 0,
  };
}
