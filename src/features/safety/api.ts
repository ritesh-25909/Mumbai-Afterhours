import { supabase } from '../../lib/supabase';

export type BlockedUser = { user_id: string; display_name: string; blocked_at: string };
export async function listBlocks(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc('list_blocks');
  if (error) throw new Error('Could not load your blocked list.');
  return data as BlockedUser[];
}
export async function unblock(id: string) {
  const { error } = await supabase.rpc('unblock_user', { target: id });
  if (error) throw new Error('Could not unblock. Try again.');
}

export type OpenReport = { report_id: string; category: string; description: string | null; created_at: string; reporter_name: string;
  reported_id: string; reported_name: string; reported_status: string; reports_against: number };
export async function listOpenReports(): Promise<OpenReport[]> {
  const { data, error } = await supabase.rpc('list_open_reports');
  if (error) throw new Error(error.message);
  return data as OpenReport[];
}
export async function resolveReport(id: string, action: 'dismiss' | 'suspend') {
  const { error } = await supabase.rpc('resolve_report', { p_report: id, p_action: action });
  if (error) throw new Error(error.message);
}
export async function reinstate(id: string) {
  const { error } = await supabase.rpc('reinstate_user', { target: id });
  if (error) throw new Error(error.message);
}

export async function deleteMyAccount(): Promise<{ cleanup_complete: boolean }> {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
  if (error) {
    const notDeployed = /not found|failed to send|404/i.test(error.message);
    throw new Error(notDeployed ? 'Account deletion is not set up on this server yet. Contact support to delete your account.' : 'Could not delete your account. Try again.');
  }
  return data as { cleanup_complete: boolean };
}

export type Suspended = { user_id: string; display_name: string };
export async function listSuspended(): Promise<Suspended[]> {
  const { data, error } = await supabase.rpc('list_suspended_users');
  if (error) throw new Error(error.message);
  return data as Suspended[];
}
