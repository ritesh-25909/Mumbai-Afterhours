
import { supabase } from '../../lib/supabase';
import { POLICY_VERSION } from '../../lib/constants';

// ======================================================
// PROFILE PROMPT ANSWER TYPE
// ======================================================

export type ProfilePromptAnswer = {
  prompt: string;
  answer: string;
};

// ======================================================
// PROFILE TYPE
// ======================================================

export type Profile = {
  id: string;

  display_name: string;
  date_of_birth: string;

  gender: string;
  interested_in: string[];

  neighbourhood: string | null;
  bio: string | null;

  languages: string[];
  interests: string[];

  relationship_intention: string | null;

  // Additional profile information
  height: string | null;
  occupation: string | null;
  college: string | null;
  education_status: string | null;

  // Supabase JSONB column
  profile_prompts: ProfilePromptAnswer[] | null;

  profile_complete: boolean;

  visibility_status: 'visible' | 'hidden';

  verified: boolean;

  moderation_status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'suspended';

  show_neighbourhood: boolean;
};

// ======================================================
// PREFERENCES TYPE
// ======================================================

export type Prefs = {
  minimum_age: number;
  maximum_age: number;
  preferred_gender: string[];
};

// ======================================================
// PROFILE INPUT TYPE
// ======================================================

export type BasicsInput = Pick<
  Profile,
  | 'display_name'
  | 'gender'
  | 'interested_in'
  | 'neighbourhood'
  | 'bio'
  | 'languages'
  | 'interests'
  | 'relationship_intention'
  | 'height'
  | 'occupation'
  | 'college'
  | 'education_status'
  | 'profile_prompts'
>;

// ======================================================
// LOAD MY PROFILE
// ======================================================

export async function getMyProfile(
  uid: string
): Promise<Profile | null> {

  if (!uid) {
    throw new Error('User ID is missing.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.error('getMyProfile failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      uid,
    });

    throw new Error(
      `Could not load your profile: ${error.message}`
    );
  }

  return data as Profile | null;
}

// ======================================================
// CREATE PROFILE
// DATE OF BIRTH CAN ONLY BE SET ON INSERT
// ======================================================

export async function createProfile(
  uid: string,
  dob: string,
  b: BasicsInput
) {

  if (!uid) {
    throw new Error('User ID is missing.');
  }

  const { error } = await supabase
    .from('profiles')
    .insert({
      id: uid,
      date_of_birth: dob,
      city: 'Mumbai',
      ...b,
    });

  if (error) {
    console.error('createProfile failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      uid,
    });

    throw new Error(
      error.message.includes('18')
        ? 'You must be 18 or older.'
        : `Could not save your profile: ${error.message}`
    );
  }

  // Save consent records after successful profile creation.
  const { error: consentError } = await supabase
    .from('user_consents')
    .insert([
      {
        user_id: uid,
        consent_type: 'terms',
        policy_version: POLICY_VERSION,
      },
      {
        user_id: uid,
        consent_type: 'privacy',
        policy_version: POLICY_VERSION,
      },
    ]);

  if (consentError) {
    console.error('createProfile consent failed:', {
      message: consentError.message,
      code: consentError.code,
      details: consentError.details,
      hint: consentError.hint,
      uid,
    });

    throw new Error(
      `Profile saved, but consent saving failed: ${consentError.message}`
    );
  }
}

// ======================================================
// UPDATE EXISTING PROFILE
// ======================================================

export async function updateProfile(
  uid: string,
  b: Partial<BasicsInput> & {
    visibility_status?: 'visible' | 'hidden';
    show_neighbourhood?: boolean;
  }
) {

  if (!uid) {
    throw new Error('User ID is missing.');
  }

  if (!b || Object.keys(b).length === 0) {
    throw new Error('No profile changes were provided.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(b)
    .eq('id', uid)
    .select('id');

  if (error) {
    console.error('UPDATE PROFILE FAILED:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload: b,
      uid,
    });

    throw new Error(
      `Profile save failed [${error.code}]: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    console.error('Profile update returned no rows:', {
      uid,
      payload: b,
    });

    throw new Error(
      'Profile was not updated. The record may not exist or database permissions may be blocking the update.'
    );
  }
}

// ======================================================
// LOAD USER PREFERENCES
// ======================================================

export async function getPrefs(
  uid: string
): Promise<Prefs | null> {

  if (!uid) {
    throw new Error('User ID is missing.');
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select(
      'minimum_age,maximum_age,preferred_gender'
    )
    .eq('user_id', uid)
    .maybeSingle();

  if (error) {
    console.error('getPrefs failed:', error);

    throw new Error(
      `Could not load preferences: ${error.message}`
    );
  }

  return data as Prefs | null;
}

// ======================================================
// SAVE USER PREFERENCES
// ======================================================

export async function savePrefs(
  uid: string,
  p: Prefs
) {

  if (!uid) {
    throw new Error('User ID is missing.');
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: uid,
      ...p,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('savePrefs failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      uid,
    });

    throw new Error(
      `Could not save preferences [${error.code}]: ${error.message}`
    );
  }
}

// ======================================================
// PUBLISH PROFILE
// ======================================================

export async function publishProfile() {

  const { error } = await supabase.rpc(
    'publish_profile'
  );

  if (error) {
    console.error('publishProfile failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(
      `Could not publish profile [${error.code}]: ${error.message}`
    );
  }
}
