
import { supabase } from '../../lib/supabase';

/**
 * Validate and normalize an international mobile number.
 *
 * Expected format: +919321844566
 * Spaces, brackets and hyphens are removed.
 */
function normalizeMobileNumber(mobileNumber: string): string {
  if (typeof mobileNumber !== 'string') {
    throw new Error('Please enter a valid mobile number.');
  }

  const normalized = mobileNumber.trim().replace(/[\s()-]/g, '');

  // International E.164 format: + followed by 8–15 digits.
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    throw new Error(
      'Enter a valid mobile number with country code, for example +919321844566.'
    );
  }

  return normalized;
}

/**
 * Always verify the authenticated user with Supabase Auth.
 *
 * Do not rely only on getSession(), because a locally cached
 * session may be stale.
 */
async function getVerifiedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error(
      'Your account could not be verified. Please sign out and sign in again.'
    );
  }

  return user.id;
}

/**
 * Retrieve the authenticated user's saved mobile number.
 */
export async function getMyMobileNumber(): Promise<string | null> {
  const userId = await getVerifiedUserId();

  const { data, error } = await supabase
    .from('user_contact_details')
    .select('mobile_number')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Mobile number lookup failed:', error.code);

    throw new Error(
      `Could not check your mobile number: ${error.message}`
    );
  }

  return data?.mobile_number ?? null;
}

/**
 * Save or update the authenticated user's mobile number.
 *
 * Security:
 * - Verifies the user through Supabase Auth.
 * - Uses the verified user's ID.
 * - Never accepts a user ID from the frontend.
 * - Updates only the authenticated user's own row.
 * - Does not disable or bypass RLS.
 */
export async function saveMyMobileNumber(
  mobileNumber: string
): Promise<void> {
  const normalized = normalizeMobileNumber(mobileNumber);

  // Verify the current user directly with Supabase Auth.
  const userId = await getVerifiedUserId();

  const { error } = await supabase
    .from('user_contact_details')
    .upsert(
      {
        user_id: userId,
        mobile_number: normalized,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

  if (error) {
    console.error('Mobile number save failed:', {
      code: error.code,
      message: error.message,
    });

    if (error.code === '23503') {
      throw new Error(
        'Your authenticated account was not found in the database. Please sign out, sign in again, and retry. If the problem continues, contact support.'
      );
    }

    if (error.code === '42501') {
      throw new Error(
        'Permission denied while saving your mobile number. Please check your account permissions.'
      );
    }

    if (error.code === '23505') {
      throw new Error(
        'This mobile number conflicts with an existing database record.'
      );
    }

    throw new Error(
      `Could not save your mobile number: ${error.message}`
    );
  }
}
