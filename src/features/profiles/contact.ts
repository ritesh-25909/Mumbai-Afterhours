import { supabase } from '../../lib/supabase';

export async function getMyMobileNumber(): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_contact_details')
    .select('mobile_number')
    .maybeSingle();

  if (error) throw new Error(`Could not check your mobile number: ${error.message}`);
  return data?.mobile_number ?? null;
}

export async function saveMyMobileNumber(mobileNumber: string): Promise<void> {
  const normalized = mobileNumber.trim();
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    throw new Error('Enter a valid mobile number with country code.');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) throw new Error('Your session could not be confirmed. Please sign in again.');

  const { error } = await supabase
    .from('user_contact_details')
    .upsert({ user_id: session.user.id, mobile_number: normalized, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) throw new Error(`Could not save your mobile number: ${error.message}`);
}
